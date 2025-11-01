// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "./IWallet.sol";

contract MultiSigWalletController is ReentrancyGuard {
    // ============ STRUCTS ============

    struct Owner {
        address ownerAddress;
        string name;
        uint256 percentage;
        bool exists;
        bool isRemovable;
        uint256 index;
    }

    struct Transaction {
        address initiator;
        address to;
        uint256 value;
        bytes data;
        bool isTokenTransfer;
        address tokenAddress;
        bool executed;
        mapping(address => bool) confirmations;
        uint256 confirmationCount;
        uint256 timestamp;
        uint256 timelockEnd;
    }

    // ============ STATE VARIABLES ============

    mapping(address => Owner) public owners;
    address[] public ownerAddresses;
    mapping(address => uint256) private ownerIndex;
    uint256 public requiredPercentage;
    address public immutable deployer;
    ICompanyWallet public immutable companyWallet;
    uint256 public poolPercentage;
    Transaction[] public transactions;
    bool public paused = false;
    uint256 public timelockPeriod = 60 seconds;
    uint256 public expiryPeriod = 7 days;
    uint256 public minOwners = 2;

    // ============ EVENTS ============

    event OwnerAdded(address indexed owner, string name, uint256 percentage);
    event OwnerRemoved(address indexed owner);
    event RequiredPercentageChanged(uint256 newPercentage);
    event TransactionSubmitted(
        uint256 indexed transactionId,
        address indexed initiator,
        address indexed to,
        uint256 value,
        bool isTokenTransfer,
        address tokenAddress,
        bytes data
    );
    event TransactionConfirmed(
        uint256 indexed transactionId,
        address indexed owner,
        uint256 percentage
    );
    event TransactionExecuted(uint256 indexed transactionId);
    event TransactionRevoked(uint256 indexed transactionId, address indexed owner);
    event ContractPaused();
    event ContractUnpaused();
    event TimelockPeriodChanged(uint256 newPeriod);
    event ExpiryPeriodChanged(uint256 newPeriod);
    event MinOwnersChanged(uint256 newMinOwners);

    // ============ MODIFIERS ============

    modifier onlyOwner() {
        require(owners[msg.sender].exists, "Not an owner");
        require(msg.sender != deployer, "Deployer cannot perform this action");
        _;
    }

    modifier onlyDeployer() {
        require(msg.sender == deployer, "Only deployer can call this");
        _;
    }

    modifier validPercentage(uint256 percentage) {
        require(percentage > 0 && percentage <= 100, "Invalid percentage");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier notExpired(uint256 transactionId) {
        require(transactionId < transactions.length, "Invalid transaction ID");
        require(
            block.timestamp <=
                transactions[transactionId].timestamp + expiryPeriod,
            "Transaction expired"
        );
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(
        address _companyWallet,
        address _ceo,
        string memory _ceoName,
        address _cto,
        string memory _ctoName
    ) {
        require(_companyWallet != address(0), "Invalid company wallet");
        require(
            _ceo != address(0) && _cto != address(0),
            "Invalid owner address"
        );
        require(
            _ceo != _cto && _ceo != msg.sender && _cto != msg.sender,
            "Duplicate addresses"
        );

        deployer = msg.sender;
        companyWallet = ICompanyWallet(_companyWallet);
        requiredPercentage = 60;
        poolPercentage = 30;

        owners[_ceo] = Owner(_ceo, _ceoName, 35, true, false, 0);
        ownerIndex[_ceo] = 0;
        ownerAddresses.push(_ceo);

        owners[_cto] = Owner(_cto, _ctoName, 35, true, false, 1);
        ownerIndex[_cto] = 1;
        ownerAddresses.push(_cto);

        emit OwnerAdded(_ceo, _ceoName, 35);
        emit OwnerAdded(_cto, _ctoName, 35);
        emit RequiredPercentageChanged(60);
    }

    // ============ OWNER MANAGEMENT (EXTERNAL) ============
    // These functions are called via proposals with encoded data
    // They are external so they can be invoked via low-level call()

    /**
     * @dev External function to add an owner. Called via proposal execution.
     * Only callable by the contract via proposal mechanism.
     */
    function addOwnerInternal(
        address newOwner,
        string memory name,
        uint256 percentage
    ) external whenNotPaused {
        // This can only be called by the contract itself via proposal execution
        require(msg.sender == address(this), "Only callable via proposal");
        require(newOwner != address(0), "Invalid owner address");
        require(newOwner != deployer, "Cannot add deployer as owner");
        require(!owners[newOwner].exists, "Owner already exists");
        require(
            percentage <= poolPercentage,
            "Exceeds available pool percentage"
        );
        require(bytes(name).length > 0, "Name cannot be empty");

        ownerIndex[newOwner] = ownerAddresses.length;
        owners[newOwner] = Owner(
            newOwner,
            name,
            percentage,
            true,
            true,
            ownerAddresses.length
        );
        ownerAddresses.push(newOwner);
        poolPercentage -= percentage;

        emit OwnerAdded(newOwner, name, percentage);
    }

    /**
     * @dev External function to remove an owner. Called via proposal execution.
     */
    function removeOwnerInternal(address ownerToRemove) external whenNotPaused {
        // This can only be called by the contract itself via proposal execution
        require(msg.sender == address(this), "Only callable via proposal");
        require(owners[ownerToRemove].exists, "Owner does not exist");
        require(owners[ownerToRemove].isRemovable, "Owner is not removable");
        require(
            ownerAddresses.length > minOwners,
            "Cannot remove below minimum owners"
        );

        poolPercentage += owners[ownerToRemove].percentage;

        uint256 indexToRemove = owners[ownerToRemove].index;
        address lastOwner = ownerAddresses[ownerAddresses.length - 1];

        ownerAddresses[indexToRemove] = lastOwner;
        ownerIndex[lastOwner] = indexToRemove;
        owners[lastOwner].index = indexToRemove;

        ownerAddresses.pop();
        delete owners[ownerToRemove];
        delete ownerIndex[ownerToRemove];

        emit OwnerRemoved(ownerToRemove);
    }

    /**
     * @dev External function to change required percentage. Called via proposal execution.
     */
    function changeRequiredPercentageInternal(uint256 newPercentage)
        external
        validPercentage(newPercentage)
        whenNotPaused
    {
        // This can only be called by the contract itself via proposal execution
        require(msg.sender == address(this), "Only callable via proposal");
        requiredPercentage = newPercentage;
        emit RequiredPercentageChanged(newPercentage);
    }

    // ============ PROPOSAL SUBMISSION FUNCTIONS ============
    // Any owner can call these to START a vote

    /**
     * @dev Submits a proposal to add a new owner.
     */
    function submitAddOwner(
        address newOwner,
        string memory name,
        uint256 percentage
    ) external onlyOwner returns (uint256) {
        bytes memory data = abi.encodeWithSignature(
            "addOwnerInternal(address,string,uint256)",
            newOwner,
            name,
            percentage
        );
        return
            submitTransaction(address(this), 0, false, address(0), data);
    }

    /**
     * @dev Submits a proposal to remove an owner.
     */
    function submitRemoveOwner(address ownerToRemove)
        external
        onlyOwner
        returns (uint256)
    {
        bytes memory data = abi.encodeWithSignature(
            "removeOwnerInternal(address)",
            ownerToRemove
        );
        return
            submitTransaction(address(this), 0, false, address(0), data);
    }

    /**
     * @dev Submits a proposal to change the required percentage.
     */
    function submitChangeRequiredPercentage(uint256 newPercentage)
        external
        onlyOwner
        returns (uint256)
    {
        bytes memory data = abi.encodeWithSignature(
            "changeRequiredPercentageInternal(uint256)",
            newPercentage
        );
        return
            submitTransaction(address(this), 0, false, address(0), data);
    }

    // ============ TRANSACTION FUNCTIONS ============

    function submitTransaction(
        address to,
        uint256 value,
        bool isTokenTransfer,
        address tokenAddress,
        bytes memory data
    ) public onlyOwner whenNotPaused nonReentrant returns (uint256) {
        require(to != address(0), "Invalid recipient address");
        require(to != address(companyWallet), "Cannot send to company wallet itself");
        if (isTokenTransfer) {
            require(tokenAddress != address(0), "Invalid token address");
        }

        uint256 transactionId = transactions.length;
        transactions.push();
        Transaction storage transaction = transactions[transactionId];

        transaction.initiator = msg.sender;
        transaction.to = to;
        transaction.value = value;
        transaction.data = data;
        transaction.isTokenTransfer = isTokenTransfer;
        transaction.tokenAddress = tokenAddress;
        transaction.executed = false;
        transaction.timestamp = block.timestamp;
        transaction.timelockEnd = 0;

        transaction.confirmations[msg.sender] = true;
        transaction.confirmationCount = owners[msg.sender].percentage;

        emit TransactionSubmitted(
            transactionId,
            msg.sender,
            to,
            value,
            isTokenTransfer,
            tokenAddress,
            data
        );
        emit TransactionConfirmed(
            transactionId,
            msg.sender,
            owners[msg.sender].percentage
        );

        if (isConfirmed(transactionId)) {
            transaction.timelockEnd = block.timestamp + timelockPeriod;
            if (timelockPeriod == 0) {
                executeTransaction(transactionId);
            }
        }

        return transactionId;
    }

    function confirmTransaction(uint256 transactionId)
        external
        onlyOwner
        whenNotPaused
        notExpired(transactionId)
        nonReentrant
    {
        Transaction storage transaction = transactions[transactionId];
        require(!transaction.executed, "Transaction already executed");
        require(!transaction.confirmations[msg.sender], "Already confirmed");

        transaction.confirmations[msg.sender] = true;
        transaction.confirmationCount += owners[msg.sender].percentage;

        emit TransactionConfirmed(
            transactionId,
            msg.sender,
            owners[msg.sender].percentage
        );

        if (isConfirmed(transactionId) && transaction.timelockEnd == 0) {
            transaction.timelockEnd = block.timestamp + timelockPeriod;
            if (timelockPeriod == 0) {
                executeTransaction(transactionId);
            }
        }
    }

    function confirmTransactionsBatch(uint256[] calldata transactionIds)
        external
        onlyOwner
        whenNotPaused
        nonReentrant
    {
        for (uint256 i = 0; i < transactionIds.length; i++) {
            uint256 transactionId = transactionIds[i];
            require(
                transactionId < transactions.length,
                "Invalid transaction ID"
            );
            require(
                block.timestamp <=
                    transactions[transactionId].timestamp + expiryPeriod,
                "Transaction expired"
            );

            Transaction storage transaction = transactions[transactionId];
            require(!transaction.executed, "Transaction already executed");
            require(!transaction.confirmations[msg.sender], "Already confirmed");

            transaction.confirmations[msg.sender] = true;
            transaction.confirmationCount += owners[msg.sender].percentage;

            emit TransactionConfirmed(
                transactionId,
                msg.sender,
                owners[msg.sender].percentage
            );

            if (isConfirmed(transactionId) && transaction.timelockEnd == 0) {
                transaction.timelockEnd = block.timestamp + timelockPeriod;
                if (timelockPeriod == 0) {
                    executeTransaction(transactionId);
                }
            }
        }
    }

    function revokeConfirmation(uint256 transactionId)
        external
        onlyOwner
        whenNotPaused
        notExpired(transactionId)
    {
        Transaction storage transaction = transactions[transactionId];
        require(!transaction.executed, "Transaction already executed");
        require(transaction.confirmations[msg.sender], "Not confirmed by sender");

        transaction.confirmations[msg.sender] = false;
        transaction.confirmationCount -= owners[msg.sender].percentage;

        emit TransactionRevoked(transactionId, msg.sender);
    }

    function executeTransactionManual(uint256 transactionId)
        external
        onlyOwner
        whenNotPaused
        notExpired(transactionId)
        nonReentrant
    {
        Transaction storage transaction = transactions[transactionId];
        require(!transaction.executed, "Transaction already executed");
        require(isConfirmed(transactionId), "Not enough confirmations");
        require(
            transaction.timelockEnd > 0 &&
                block.timestamp >= transaction.timelockEnd,
            "Timelock not elapsed"
        );

        executeTransaction(transactionId);
    }

    function executeTransaction(uint256 transactionId) private {
        Transaction storage transaction = transactions[transactionId];
        require(!transaction.executed, "Transaction already executed");
        require(isConfirmed(transactionId), "Not enough confirmations");
        require(
            (transaction.timelockEnd > 0 &&
                block.timestamp >= transaction.timelockEnd) ||
                timelockPeriod == 0,
            "Timelock not elapsed"
        );

        transaction.executed = true;

        // If 'to' is this contract, it's an internal admin call
        if (transaction.to == address(this)) {
            (bool success, ) = address(this).call(transaction.data);
            require(success, "Internal transaction execution failed");
        } else {
            // Otherwise, it's an external call via the company wallet
            bool success = companyWallet.executeTransaction(
                transaction.to,
                transaction.value,
                transaction.isTokenTransfer,
                transaction.tokenAddress,
                transaction.data
            );
            require(success, "External transaction execution failed");
        }

        emit TransactionExecuted(transactionId);
    }

    // ============ VIEW FUNCTIONS ============

    function isConfirmed(uint256 transactionId) public view returns (bool) {
        return transactions[transactionId].confirmationCount >= requiredPercentage;
    }

    function getTransaction(uint256 transactionId)
        external
        view
        returns (
            address initiator,
            address to,
            uint256 value,
            bytes memory data,
            bool isTokenTransfer,
            address tokenAddress,
            bool executed,
            uint256 confirmationCount,
            uint256 timestamp,
            uint256 timelockEnd
        )
    {
        require(transactionId < transactions.length, "Invalid transaction ID");
        Transaction storage transaction = transactions[transactionId];

        return (
            transaction.initiator,
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.isTokenTransfer,
            transaction.tokenAddress,
            transaction.executed,
            transaction.confirmationCount,
            transaction.timestamp,
            transaction.timelockEnd
        );
    }

    function hasConfirmed(uint256 transactionId, address owner)
        external
        view
        returns (bool)
    {
        require(transactionId < transactions.length, "Invalid transaction ID");
        return transactions[transactionId].confirmations[owner];
    }

    function getTransactionCount() external view returns (uint256) {
        return transactions.length;
    }

    function getOwnerCount() external view returns (uint256) {
        return ownerAddresses.length;
    }

    function getOwners()
        external
        view
        returns (
            address[] memory addresses,
            string[] memory names,
            uint256[] memory percentages,
            bool[] memory removables
        )
    {
        string[] memory ownerNames = new string[](ownerAddresses.length);
        uint256[] memory ownerPercentages = new uint256[](
            ownerAddresses.length
        );
        bool[] memory ownerRemovables = new bool[](ownerAddresses.length);

        for (uint256 i = 0; i < ownerAddresses.length; i++) {
            ownerNames[i] = owners[ownerAddresses[i]].name;
            ownerPercentages[i] = owners[ownerAddresses[i]].percentage;
            ownerRemovables[i] = owners[ownerAddresses[i]].isRemovable;
        }

        return (ownerAddresses, ownerNames, ownerPercentages, ownerRemovables);
    }

    function getPoolPercentage() external view returns (uint256) {
        return poolPercentage;
    }

    function test() external pure {}

    // ============ EMERGENCY FUNCTIONS (Deployer Only) ============

    function pause() external onlyDeployer {
        paused = true;
        emit ContractPaused();
    }

    function unpause() external onlyDeployer {
        paused = false;
        emit ContractUnpaused();
    }
}