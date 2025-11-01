// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/multisig.sol";
import "../src/wallet.sol";

contract DeployMultiSig is Script {
    function run()
        external
        returns (address deployedWallet, address deployedController)
    {
        // --- 1. Load Environment Variables ---
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address ceo = vm.envAddress("CEO_ADDRESS");
        string memory ceoName = vm.envString("CEO_NAME");
        address cto = vm.envAddress("CTO_ADDRESS");
        string memory ctoName = vm.envString("CTO_NAME");

        address deployer = vm.addr(deployerKey);
        console.log("Deployer Address:", deployer);

        // --- 2. Start Broadcast ---
        vm.startBroadcast(deployerKey);

        // --- TRANSACTION 1 (Nonce 0) ---
        // Deploy CompanyWallet
        // We pass the *deployer* as the initial owner.
        console.log("Deploying CompanyWallet...");
        CompanyWallet wallet = new CompanyWallet(deployer);
        deployedWallet = address(wallet);
        console.log("CompanyWallet deployed to:", deployedWallet);

        // --- TRANSACTION 2 (Nonce 1) ---
        // Deploy MultiSigWalletController
        console.log("Deploying MultiSigWalletController...");
        MultiSigWalletController controller = new MultiSigWalletController(
            deployedWallet,
            ceo,
            ceoName,
            cto,
            ctoName
        );
        deployedController = address(controller);
        console.log(
            "MultiSigWalletController deployed to:",
            deployedController
        );

        // --- TRANSACTION 3 (Nonce 2) ---
        // Set the controller on the wallet
        console.log("Setting controller on wallet...");
        wallet.setController(deployedController);

        // --- TRANSACTION 4 (Nonce 3) ---
        // Renounce ownership of the wallet
        console.log("Renouncing wallet ownership...");
        wallet.renounceOwnership();

        console.log("Deployment complete.");

        vm.stopBroadcast();
    }
}











// pragma solidity ^0.8.20;

// import "forge-std/Script.sol";
// import "../src/multisig.sol"; // Adjust path if needed
// import "../src/wallet.sol";            // Adjust path if needed

// /**
//  * @dev Interface for the EIP-2470 CREATE2 Singleton Factory.
//  * This factory is deployed at 0x0000000000FFe8B47B3e2130213B802212439497
//  * on most EVM chains.
//  */
// interface ICREATE2Factory {
//     function deploy(bytes memory _initCode, bytes32 _salt) external returns (address);
//     function computeAddress(bytes32 _salt, bytes32 _initCodeHash) external view returns (address);
// }

// contract DeployMultiSig is Script {
//     // EIP-2470 Singleton Factory address
//     ICREATE2Factory public constant FACTORY =
//         ICREATE2Factory(0x0000000000FFe8B47B3e2130213B802212439497);

//     // Your unique salts. Change these strings to deploy new versions.
//     bytes32 public constant WALLET_SALT = keccak256("MY_PROJECT_WALLET_V1");
//     bytes32 public constant CONTROLLER_SALT = keccak256("MY_PROJECT_CONTROLLER_V1");

//     function run()
//         external
//         returns (address deployedWallet, address deployedController)
//     {
//         // --- 1. Load Environment Variables ---
//         uint256 deployerKey = vm.envUint("PRIVATE_KEY");
//         address ceo = vm.envAddress("CEO_ADDRESS");
//         string memory ceoName = vm.envString("CEO_NAME");
//         address cto = vm.envAddress("CTO_ADDRESS");
//         string memory ctoName = vm.envString("CTO_NAME");

//         // The deployer will be the initial owner of CompanyWallet
//         address deployer = vm.addr(deployerKey);

//         console.log("Deployer Address:", deployer);
//         console.log("CEO Address:", ceo);
//         console.log("CTO Address:", cto);

//         // --- 2. Pre-calculate CompanyWallet Address ---
//         bytes memory walletInitCode = abi.encodePacked(
//             type(CompanyWallet).creationCode,
//             abi.encode(deployer) // Pass deployer as initialOwner
//         );
//         bytes32 walletInitCodeHash = keccak256(walletInitCode);
//         address predictedWalletAddress = FACTORY.computeAddress(
//             WALLET_SALT,
//             walletInitCodeHash
//         );
//         console.log("Predicted CompanyWallet Address:", predictedWalletAddress);

//         // --- 3. Pre-calculate Controller Address ---
//         bytes memory controllerInitCode = abi.encodePacked(
//             type(MultiSigWalletController).creationCode,
//             abi.encode(
//                 predictedWalletAddress, // Pass the *future* wallet address
//                 ceo,
//                 ceoName,
//                 cto,
//                 ctoName
//             )
//         );
//         bytes32 controllerInitCodeHash = keccak256(controllerInitCode);
//         address predictedControllerAddress = FACTORY.computeAddress(
//             CONTROLLER_SALT,
//             controllerInitCodeHash
//         );
//         console.log(
//             "Predicted Controller Address:",
//             predictedControllerAddress
//         );

//         // --- 4. Start Broadcast ---
//         vm.startBroadcast(deployerKey);

//         // --- 5. Deploy CompanyWallet ---
//         // Only deploy if it's not already there
//         if (predictedWalletAddress.code.length == 0) {
//             console.log("Deploying CompanyWallet...");
//             deployedWallet = FACTORY.deploy(walletInitCode, WALLET_SALT);
//             console.log("Deployed CompanyWallet to:", deployedWallet);
//             require(
//                 deployedWallet == predictedWalletAddress,
//                 "Wallet address mismatch"
//             );
//         } else {
//             console.log("CompanyWallet already deployed at:", predictedWalletAddress);
//             deployedWallet = predictedWalletAddress;
//         }

//         // --- 6. Deploy MultiSigWalletController ---
//         // Only deploy if it's not already there
//         if (predictedControllerAddress.code.length == 0) {
//             console.log("Deploying MultiSigWalletController...");
//             deployedController = FACTORY.deploy(
//                 controllerInitCode,
//                 CONTROLLER_SALT
//             );
//             console.log(
//                 "Deployed MultiSigWalletController to:",
//                 deployedController
//             );
//             require(
//                 deployedController == predictedControllerAddress,
//                 "Controller address mismatch"
//             );
//         } else {
//             console.log(
//                 "MultiSigWalletController already deployed at:",
//                 predictedControllerAddress
//             );
//             deployedController = predictedControllerAddress;
//         }

//         // --- 7. Post-Deployment Setup ---
//         CompanyWallet wallet = CompanyWallet(payable(deployedWallet));

//         // Set the controller, only if it's not already set
//         if (wallet.controller() == address(0)) {
//             console.log("Setting controller on CompanyWallet...");
//             wallet.setController(deployedController);
//             console.log("Controller set.");
//         } else {
//             console.log("Controller already set on CompanyWallet.");
//         }
        
//         // Renounce ownership for full multisig control
//         if (wallet.owner() == deployer) {
//             console.log("Renouncing CompanyWallet ownership...");
//             wallet.renounceOwnership();
//             console.log("Ownership renounced.");
//         } else {
//             console.log("CompanyWallet ownership already renounced or not held by deployer.");
//         }

//         vm.stopBroadcast();
//     }
// }

