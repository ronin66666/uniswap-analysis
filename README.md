## solidity测试代码

部分代码在分支中查看

## Hardhat部署和测试

[hardhat文档地址](https://hardhat.org/getting-started/)

### 创建项目

```shell
npx hadhat
```

### hardhat-deploy插件

[hardhat-deploy文档](https://github.com/wighawag/hardhat-deploy)

### Installation
```shell

npm install --save-dev hardhat-deploy
npm install --save-dev  @nomiclabs/hardhat-ethers@npm:hardhat-deploy-ethers ethers

```

## Usage

1. 执行`npm install` 

2. 创建`.secret`文件并输入用于测试的私钥，多个私钥逗号隔开

3. `hardhat.config`中配置相关网络和账户

4. 使用`hardhat`部署

   1. 使用`hardhat`节点部署
      启动节点 `npx hardhat node` or `npx hardhat node --tags greeter`
      部署`npx hardhat deploy --tags hello`

   2. 使用默认网络部署（在`hardhat.config.ts`中指定`defaultNetwork`）

      `npx hardhat deploy --tags greeter`

      或者指定网络

      `npx hardhat deploy --tags greeter --network ropsten` 

5. 运行脚本

   `npx hardhat run script/test.ts `

   `npx hardhat run script/test.ts --network ropsten` 

## Other

### openzeppelin

[文档地址](https://docs.openzeppelin.com/)

```sell
npm install --save--dev @openzeppelin/contracts
npm install --save--dev @openzeppelin/contracts-upgradeable
```

### list

transfer, send, call, delegateCall

abi

prox

离线签名(erc2612, erc712)
