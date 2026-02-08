// generate-wallet.js
const { ethers } = require("ethers"); // Il faut installer ethers: npm install ethers
const fs = require("fs");

function createWallet() {
  // 1. Création aléatoire
  const wallet = ethers.Wallet.createRandom();

  console.log("----------------------------------------------------");
  console.log("🎉 NOUVEAU WALLET PLASMA GÉNÉRÉ !");
  console.log("----------------------------------------------------");
  console.log(`📍 Adresse Publique : ${wallet.address}`);
  console.log(`🔑 Clé Privée       : ${wallet.privateKey}`);
  console.log("----------------------------------------------------");

  // 2. Sauvegarde dans un fichier JSON pour ne pas le perdre
  const content = JSON.stringify(
    {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase,
    },
    null,
    2,
  );

  fs.writeFileSync("plasma-wallet-secret.json", content);
  console.log("✅ Sauvegardé dans 'plasma-wallet-secret.json'");
  console.log("⚠️  ATTENTION : Ne commit jamais ce fichier sur GitHub !");
}

createWallet();
