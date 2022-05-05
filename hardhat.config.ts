import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-deploy"
import fs from "fs";
import { ethers, hardhatArguments } from "hardhat";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});
const accounts = fs.readFileSync(".secret").toString().trim().split(",");

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.4.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999
          }
        }
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 5000
          }
        }
      }
    ]
  },
  defaultNetwork: "localhost",
  networks: {
    hardhat: {//启动hardhat节点默认生成20个账户
      allowUnlimitedContractSize: true,
    },
    localhost: {
      url: "http://127.0.0.1:8545/",
      //使用本地测试账户：通过npx hardhat node --network hardhat --no-deploy 命令可查看
      accounts: ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"],
    },
    rinkeby: {
      url: "https://rinkeby.infura.io/v3/" + process.env.infura_key,
      chainId: 4,
      accounts: accounts
    },
    bsctest: {
      allowUnlimitedContractSize: true,
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      accounts: accounts
      //live: false, //指定是否是一个线上的链，localhost and hardhat where the default is false
      //tags: ["bsctest"] //设置网络别名，可通过hre.network.tags获得
    },
    ropsten: {
      url: "https://ropsten.infura.io/v3/" + process.env.infura_key,
      accounts: accounts
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    user1: {
      default: 1
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
