// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MultiSig Wallet Controller
 * @dev This contract acts as a controller for a company wallet, requiring multisig approval
 *      for all outgoing Ether and ERC-20 token transactions.
 * 
 * HOW IT WORKS:
 * 1. Company wallet delegates transaction authority to this controller
 * 2. Owners submit transaction proposals (Ether or ERC-20) through this controller
 * 3. Other owners confirm transactions based on their voting percentage
 * 4. When enough confirmations are reached, transaction waits for timelock then executes
 * 
 * ARCHITECTURE:
 * Company Wallet (holds funds) ← Controller (this contract) ← Owners (submit/confirm transactions)
 */

/**
 * @dev Interface that the company wallet must implement to work with this controller
 */
interface ICompanyWallet {
    function executeTransaction(
        address to,
        uint256 value,
        bool isTokenTransfer,
        address tokenAddress,
        bytes calldata data
    ) external returns (bool);
    function getBalance() external view returns (uint256);
    function getTokenBalance(address token) external view returns (uint256);
}

contract MultiSigWalletController {
    
    // ============ STRUCTS ============
    
    /**
     * @dev Structure to store owner information
     * @param ownerAddress The wallet address of the owner
     * @param percentage The voting percentage this owner holds (0-100)
     * @param exists Whether this owner exists in the system
     * @param isRemovable Whether this owner can be removed (CEO/CTO are non-removable)
     */
    struct Owner {
        address ownerAddress;
        uint256 percentage;
        bool exists;
        bool isRemovable;
    }
    
    /**
     * @dev Structure to store transaction information
     * @param to Recipient address for the transaction
     * @param value Amount of ETH or tokens to send
     * @param data Additional data to send with the transaction (for Ether transfers)
     * @param isTokenTransfer True if transferring ERC-20 tokens, false for Ether
     * @param tokenAddress Address of the ERC-20 token contract (ignored if isTokenTransfer is false)
     * @param executed Whether the transaction has been executed
     * @param confirmations Mapping of owner addresses to their confirmation status
     * @param confirmationCount Total percentage of confirmations received
     * @param timestamp When the transaction was submitted
     * @param timelockEnd When the timelock period ends (0 if not yet confirmed)
     */
    struct Transaction {
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
    
    /// @dev Mapping of owner addresses to their details
    mapping(address => Owner) public owners;
    
    /// @dev Array of all owner addresses for easy iteration
    address[] public ownerAddresses;
    
    /// @dev Required confirmation percentage to execute transactions (0-100)
    uint256 public requiredPercentage;
    
    /// @dev Address of the deployer (has special privileges but cannot execute transactions)
    address public immutable deployer;
    
    /// @dev Address of the company wallet that holds the actual funds
    address public immutable companyWallet;
    
    /// @dev Percentage available for new owners (starts at 30%, decreases as owners are added)
    uint256 public poolPercentage;
    
    /// @dev Array of all submitted transactions
    Transaction[] public transactions;
    
    /// @dev Emergency pause state
    bool public paused = false;
    
    /// @dev Timelock period for transactions after sufficient confirmations (in seconds)
    uint256 public timelockPeriod = 1 days;
    
    /// @dev Expiry period for transactions (in seconds)
    uint256 public expiryPeriod = 7 days;
    
    /// @dev Minimum number of owners required
    uint256 public minOwners = 2;
    
    // ============ EVENTS ============
    
    event OwnerAdded(address indexed owner, uint256 percentage);
    event OwnerRemoved(address indexed owner);
    event RequiredPercentageChanged(uint256 newPercentage);
    event TransactionSubmitted(uint256 indexed transactionId, address indexed to, uint256 value, bool isTokenTransfer, address tokenAddress, bytes data);
    event TransactionConfirmed(uint256 indexed transactionId, address indexed owner, uint256 percentage);
    event TransactionExecuted(uint256 indexed transactionId);
    event TransactionRevoked(uint256 indexed transactionId, address indexed owner);
    event ContractPaused();
    event ContractUnpaused();
    event TimelockPeriodChanged(uint256 newPeriod);
    event ExpiryPeriodChanged(uint256 newPeriod);
    event MinOwnersChanged(uint256 newMinOwners);
    
    // ============ MODIFIERS ============
    
    /**
     * @dev Restricts function access to existing owners only (excludes deployer)
     */
    modifier onlyOwner() {
        require(owners[msg.sender].exists, "Not an owner");
        require(msg.sender != deployer, "Deployer cannot perform this action");
        _;
    }
    
    /**
     * @dev Restricts function access to deployer only
     */
    modifier onlyDeployer() {
        require(msg.sender == deployer, "Only deployer can call this");
        _;
    }
    
    /**
     * @dev Validates that percentage is between 1 and 100
     */
    modifier validPercentage(uint256 percentage) {
        require(percentage > 0 && percentage <= 100, "Invalid percentage");
        _;
    }
    
    /**
     * @dev Prevents function execution when contract is paused
     */
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    /**
     * @dev Validates that transaction is not expired
     */
    modifier notExpired(uint256 transactionId) {
        require(transactionId < transactions.length, "Invalid transaction ID");
        require(block.timestamp <= transactions[transactionId].timestamp + expiryPeriod, "Transaction expired");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    /**
     * @dev Initialize the multisig wallet controller
     * @param _companyWallet Address of the company wallet that holds funds
     * @param _ceo Address of the CEO (gets 35% voting power, non-removable)
     * @param _cto Address of the CTO (gets 35% voting power, non-removable)
     */
    constructor(address _companyWallet, address _ceo, address _cto) {
        require(_companyWallet != address(0), "Invalid company wallet");
        require(_ceo != address(0) && _cto != address(0), "Invalid owner address");
        require(_ceo != _cto && _ceo != msg.sender && _cto != msg.sender, "Duplicate addresses");
        
        deployer = msg.sender;
        companyWallet = _companyWallet;
        
        requiredPercentage = 60;
        poolPercentage = 30;
        
        owners[_ceo] = Owner(_ceo, 35, true, false);
        ownerAddresses.push(_ceo);
        
        owners[_cto] = Owner(_cto, 35, true, false);
        ownerAddresses.push(_cto);
        
        emit OwnerAdded(_ceo, 35);
        emit OwnerAdded(_cto, 35);
        emit RequiredPercentageChanged(60);
    }
    
    // ============ OWNER MANAGEMENT FUNCTIONS ============
    
    /**
     * @dev Add a new owner to the multisig wallet
     * @param newOwner Address of the new owner
     * @param percentage Voting percentage to assign
     */
    function addOwner(address newOwner, uint256 percentage) 
        external 
        onlyOwner 
        validPercentage(percentage) 
        whenNotPaused 
    {
        require(newOwner != address(0), "Invalid owner address");
        require(newOwner != deployer, "Cannot add deployer as owner");
        require(!owners[newOwner].exists, "Owner already exists");
        require(percentage <= poolPercentage, "Exceeds available pool percentage");
        
        owners[newOwner] = Owner(newOwner, percentage, true, true);
        ownerAddresses.push(newOwner);
        poolPercentage -= percentage;
        
        emit OwnerAdded(newOwner, percentage);
    }
    
    /**
     * @dev Remove an existing owner from the multisig wallet
     * @param ownerToRemove Address of the owner to remove
     */
    function removeOwner(address ownerToRemove) external onlyOwner whenNotPaused {
        require(owners[ownerToRemove].exists, "Owner does not exist");
        require(owners[ownerToRemove].isRemovable, "Owner is not removable");
        require(ownerAddresses.length > minOwners, "Cannot remove below minimum owners");
        
        poolPercentage += owners[ownerToRemove].percentage;
        delete owners[ownerToRemove];
        
        for (uint256 i = 0; i < ownerAddresses.length; i++) {
            if (ownerAddresses[i] == ownerToRemove) {
                ownerAddresses[i] = ownerAddresses[ownerAddresses.length - 1];
                ownerAddresses.pop();
                break;
            }
        }
        
        emit OwnerRemoved(ownerToRemove);
    }
    
    /**
     * @dev Change the required confirmation percentage for transaction execution
     * @param newPercentage New required percentage (1-100)
     */
    function changeRequiredPercentage(uint256 newPercentage) 
        external 
        onlyOwner 
        validPercentage(newPercentage) 
        whenNotPaused 
    {
        requiredPercentage = newPercentage;
        emit RequiredPercentageChanged(newPercentage);
    }
    
    /**
     * @dev Set the minimum number of owners
     * @param newMinOwners New minimum number of owners
     */
    function setMinOwners(uint256 newMinOwners) external onlyOwner whenNotPaused {
        require(newMinOwners >= 2, "Minimum owners must be at least 2");
        require(newMinOwners <= ownerAddresses.length, "Cannot set minimum above current owners");
        minOwners = newMinOwners;
        emit MinOwnersChanged(newMinOwners);
    }
    
    /**
     * @dev Set the timelock period for transactions
     * @param newPeriod New timelock period in seconds
     */
    function setTimelockPeriod(uint256 newPeriod) external onlyOwner whenNotPaused {
        require(newPeriod <= 30 days, "Timelock period too long");
        timelockPeriod = newPeriod;
        emit TimelockPeriodChanged(newPeriod);
    }
    
    /**
     * @dev Set the expiry period for transactions
     * @param newPeriod New expiry period in seconds
     */
    function setExpiryPeriod(uint256 newPeriod) external onlyOwner whenNotPaused {
        require(newPeriod >= 1 days, "Expiry period too short");
        expiryPeriod = newPeriod;
        emit ExpiryPeriodChanged(newPeriod);
    }
    
    // ============ TRANSACTION FUNCTIONS ============
    
    /**
     * @dev Submit a new transaction for multisig approval
     * @param to Recipient address
     * @param value Amount of ETH or tokens to send
     * @param isTokenTransfer True if transferring ERC-20 tokens, false for Ether
     * @param tokenAddress Address of the ERC-20 token contract (ignored if isTokenTransfer is false)
     * @param data Additional data to send (for Ether transfers)
     * @return transactionId The ID of the submitted transaction
     */
    function submitTransaction(
        address to,
        uint256 value,
        bool isTokenTransfer,
        address tokenAddress,
        bytes memory data
    ) 
        external 
        onlyOwner 
        whenNotPaused 
        returns (uint256) 
    {
        require(to != address(0), "Invalid recipient address");
        require(to != companyWallet, "Cannot send to company wallet itself");
        require(to != address(this), "Cannot send to controller contract");
        if (isTokenTransfer) {
            require(tokenAddress != address(0), "Invalid token address");
        }
        
        uint256 transactionId = transactions.length;
        transactions.push();
        Transaction storage transaction = transactions[transactionId];
        
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
        
        emit TransactionSubmitted(transactionId, to, value, isTokenTransfer, tokenAddress, data);
        emit TransactionConfirmed(transactionId, msg.sender, owners[msg.sender].percentage);
        
        if (isConfirmed(transactionId)) {
            transaction.timelockEnd = block.timestamp + timelockPeriod;
            if (timelockPeriod == 0) {
                executeTransaction(transactionId);
            }
        }
        
        return transactionId;
    }
    
    /**
     * @dev Confirm a pending transaction
     * @param transactionId ID of the transaction to confirm
     */
    function confirmTransaction(uint256 transactionId) 
        external 
        onlyOwner 
        whenNotPaused 
        notExpired(transactionId) 
    {
        Transaction storage transaction = transactions[transactionId];
        require(!transaction.executed, "Transaction already executed");
        require(!transaction.confirmations[msg.sender], "Already confirmed");
        
        transaction.confirmations[msg.sender] = true;
        transaction.confirmationCount += owners[msg.sender].percentage;
        
        emit TransactionConfirmed(transactionId, msg.sender, owners[msg.sender].percentage);
        
        if (isConfirmed(transactionId) && transaction.timelockEnd == 0) {
            transaction.timelockEnd = block.timestamp + timelockPeriod;
            if (timelockPeriod == 0) {
                executeTransaction(transactionId);
            }
        }
    }
    
    /**
     * @dev Confirm multiple transactions in one call
     * @param transactionIds Array of transaction IDs to confirm
     */
    function confirmTransactionsBatch(uint256[] calldata transactionIds) 
        external 
        onlyOwner 
        whenNotPaused 
    {
        for (uint256 i = 0; i < transactionIds.length; i++) {
            uint256 transactionId = transactionIds[i];
            require(transactionId < transactions.length, "Invalid transaction ID");
            require(block.timestamp <= transactions[transactionId].timestamp + expiryPeriod, "Transaction expired");
            
            Transaction storage transaction = transactions[transactionId];
            require(!transaction.executed, "Transaction already executed");
            require(!transaction.confirmations[msg.sender], "Already confirmed");
            
            transaction.confirmations[msg.sender] = true;
            transaction.confirmationCount += owners[msg.sender].percentage;
            
            emit TransactionConfirmed(transactionId, msg.sender, owners[msg.sender].percentage);
            
            if (isConfirmed(transactionId) && transaction.timelockEnd == 0) {
                transaction.timelockEnd = block.timestamp + timelockPeriod;
                if (timelockPeriod == 0) {
                    executeTransaction(transactionId);
                }
            }
        }
    }
    
    /**
     * @dev Revoke a previous confirmation for a pending transaction
     * @param transactionId ID of the transaction to revoke confirmation for
     */
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
    
    /**
     * @dev Manual execution of a confirmed transaction
     * @param transactionId ID of the transaction to execute
     */
    function executeTransactionManual(uint256 transactionId) 
        external 
        onlyOwner 
        whenNotPaused 
        notExpired(transactionId) 
    {
        Transaction storage transaction = transactions[transactionId];
        require(!transaction.executed, "Transaction already executed");
        require(isConfirmed(transactionId), "Not enough confirmations");
        require(transaction.timelockEnd > 0 && block.timestamp >= transaction.timelockEnd, "Timelock not elapsed");
        
        executeTransaction(transactionId);
    }
    
    /**
     * @dev Internal function to execute a confirmed transaction
     * @param transactionId ID of the transaction to execute
     */
    function executeTransaction(uint256 transactionId) private {
        Transaction storage transaction = transactions[transactionId];
        require(!transaction.executed, "Transaction already executed");
        require(isConfirmed(transactionId), "Not enough confirmations");
        require(transaction.timelockEnd > 0 && block.timestamp >= transaction.timelockEnd, "Timelock not elapsed");
        
        transaction.executed = true;
        
        (bool success, ) = companyWallet.call(
            abi.encodeWithSignature(
                "executeTransaction(address,uint256,bool,address,bytes)",
                transaction.to,
                transaction.value,
                transaction.isTokenTransfer,
                transaction.tokenAddress,
                transaction.data
            )
        );
        require(success, "Transaction execution failed");
        
        emit TransactionExecuted(transactionId);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Check if a transaction has enough confirmations to be executed
     * @param transactionId ID of the transaction to check
     * @return bool True if transaction has enough confirmations
     */
    function isConfirmed(uint256 transactionId) public view returns (bool) {
        return transactions[transactionId].confirmationCount >= requiredPercentage;
    }
    
    /**
     * @dev Get detailed information about a transaction
     * @param transactionId ID of the transaction
     */
    function getTransaction(uint256 transactionId) 
        external 
        view 
        returns (
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
    
    /**
     * @dev Check if a specific owner has confirmed a transaction
     * @param transactionId ID of the transaction
     * @param owner Address of the owner
     * @return bool True if owner has confirmed
     */
    function hasConfirmed(uint256 transactionId, address owner) external view returns (bool) {
        require(transactionId < transactions.length, "Invalid transaction ID");
        return transactions[transactionId].confirmations[owner];
    }
    
    /**
     * @dev Get total number of submitted transactions
     * @return uint256 Total transaction count
     */
    function getTransactionCount() external view returns (uint256) {
        return transactions.length;
    }
    
    /**
     * @dev Get total number of owners
     * @return uint256 Total owner count
     */
    function getOwnerCount() external view returns (uint256) {
        return ownerAddresses.length;
    }
    
    /**
     * @dev Get all owner information
     */
    function getOwners() 
        external 
        view 
        returns (
            address[] memory addresses,
            uint256[] memory percentages,
            bool[] memory removables
        ) 
    {
        uint256[] memory ownerPercentages = new uint256[](ownerAddresses.length);
        bool[] memory ownerRemovables = new bool[](ownerAddresses.length);
        
        for (uint256 i = 0; i < ownerAddresses.length; i++) {
            ownerPercentages[i] = owners[ownerAddresses[i]].percentage;
            ownerRemovables[i] = owners[ownerAddresses[i]].isRemovable;
        }
        
        return (ownerAddresses, ownerPercentages, ownerRemovables);
    }
    
    /**
     * @dev Get available percentage for new owners
     * @return uint256 Available pool percentage
     */
    function getPoolPercentage() external view returns (uint256) {
        return poolPercentage;
    }
    
    /**
     * @dev Get all pending (unexecuted and not expired) transaction IDs
     * @return uint256[] Array of pending transaction IDs
     */
    function getPendingTransactions() external view returns (uint256[] memory) {
        uint256[] memory tempPending = new uint256[](transactions.length);
        uint256 pendingCount = 0;
        
        for (uint256 i = 0; i < transactions.length; i++) {
            if (!transactions[i].executed && block.timestamp <= transactions[i].timestamp + expiryPeriod) {
                tempPending[pendingCount] = i;
                pendingCount++;
            }
        }
        
        uint256[] memory pending = new uint256[](pendingCount);
        for (uint256 i = 0; i < pendingCount; i++) {
            pending[i] = tempPending[i];
        }
        
        return pending;
    }
    
    // ============ EMERGENCY FUNCTIONS ============
    
    /**
     * @dev Pause the contract (emergency function)
     */
    function pause() external onlyDeployer {
        paused = true;
        emit ContractPaused();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyDeployer {
        paused = false;
        emit ContractUnpaused();
    }
}