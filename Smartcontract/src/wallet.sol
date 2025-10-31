// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "./IWallet.sol";

/**
 * @title Company Wallet
 * @dev This contract holds Ether and ERC-20 tokens, executing transactions only when
 * called by the authorized MultiSigWalletController.
 *
 * SETUP REQUIRED:
 * 1. Deploy this contract
 * 2. Deploy MultiSigWalletController with this contract's address
 * 3. Call setController() ONCE to authorize the controller
 * 4. Transfer Ether or ERC-20 tokens to this contract
 * 5. [Optional] Call renounceOwnership() to permanently lock the contract
 */
contract CompanyWallet is ICompanyWallet {
    /// @dev Address of the wallet owner (for setup only)
    address public owner;

    /// @dev Address of the authorized controller contract
    address public controller;

    // ============ EVENTS ============

    event ControllerChanged(
        address indexed oldController,
        address indexed newController
    );
    event TransactionExecuted(
        address indexed to,
        uint256 value,
        bool isTokenTransfer,
        address tokenAddress,
        bool success
    );
    event TokensReceived(address indexed token, address indexed from, uint256 amount);
    event OwnershipRenounced(address indexed oldOwner);

    // ============ MODIFIERS ============

    modifier onlyController() {
        require(msg.sender == controller, "Only controller can execute");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(address initialOwner) {
        require(initialOwner != address(0), "Invalid initial owner");
        owner = initialOwner;
    }

    // ============ SETUP FUNCTIONS ============

    /**
     * @dev Set the controller contract address.
     * CRITICAL: This can only be called ONCE.
     * @param _controller Address of the MultiSigWalletController
     */
    function setController(address _controller) external onlyOwner {
        require(controller == address(0), "Controller already set");
        require(_controller != address(0), "Invalid controller address");

        address oldController = controller;
        controller = _controller;

        emit ControllerChanged(oldController, _controller);
    }

    /**
     * @dev Renounce ownership after setup for additional security.
     * This is permanent and irreversible.
     */
    function renounceOwnership() external onlyOwner {
        address oldOwner = owner;
        owner = address(0);
        emit OwnershipRenounced(oldOwner);
    }

    // ============ TRANSACTION EXECUTION ============

    /**
     * @dev Execute a transaction (Ether or ERC-20 token, called by controller only)
     * @param to Recipient address
     * @param value Amount of Ether or tokens to send
     * @param isTokenTransfer True if transferring ERC-20 tokens, false for Ether
     * @param tokenAddress Address of the ERC-20 token contract
     * @param data Additional data to send (for Ether transfers only)
     * @return bool True if transaction succeeded
     */
    function executeTransaction(
        address to,
        uint256 value,
        bool isTokenTransfer,
        address tokenAddress,
        bytes calldata data
    ) external override onlyController returns (bool) {
        require(to != address(0), "Invalid recipient");

        bool success;
        if (isTokenTransfer) {
            require(tokenAddress != address(0), "Invalid token address");
            require(
                IERC20(tokenAddress).balanceOf(address(this)) >= value,
                "Insufficient token balance"
            );
            success = IERC20(tokenAddress).transfer(to, value);
        } else {
            require(
                address(this).balance >= value,
                "Insufficient Ether balance"
            );
            (success, ) = to.call{value: value}(data);
        }

        emit TransactionExecuted(to, value, isTokenTransfer, tokenAddress, success);

        return success;
    }

    // ============ TOKEN RECEIPT ============

    /**
     * @dev Receive ERC-20 tokens sent to this contract
     * @param token Address of the ERC-20 token contract
     * @param amount Amount of tokens to receive
     */
    function receiveTokens(address token, uint256 amount) external {
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        require(
            IERC20(token).transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );

        emit TokensReceived(token, msg.sender, amount);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Get the current Ether balance of the wallet
     * @return uint256 Balance in wei
     */
    function getBalance() external view override returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get the current balance of an ERC-20 token
     * @param token Address of the ERC-20 token contract
     * @return uint256 Token balance
     */
    function getTokenBalance(address token)
        external
        view
        override
        returns (uint256)
    {
        require(token != address(0), "Invalid token address");
        return IERC20(token).balanceOf(address(this));
    }

    // ============ RECEIVE FUNCTIONS ============

    receive() external payable {
        // Contract can receive ETH
    }

    fallback() external payable {
        // Handle unexpected calls
    }
}