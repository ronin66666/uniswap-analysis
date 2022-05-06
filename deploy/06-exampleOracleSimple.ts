import { deployments, getNamedAccounts } from "hardhat";

// export default async function exampleOracleSimple() {
 async function exampleOracleSimple() {

    const { deployer } = await getNamedAccounts();

    const factoryAddress = (await deployments.get("UniswapV2Factory")).address;
    const tokenAAddr = (await deployments.get("TokenAERC20")).address;
    const tokenBAddr = (await deployments.get("TokenBERC20")).address;

    const result = await deployments.deploy("ExampleOracleSimple", {
        from: deployer,
        log: true,
        args: [factoryAddress, tokenAAddr, tokenBAddr] //初始化deployer为交易费管理员
    });

    console.log("exampleOracleSimple address = ", result.address);
}

// exampleOracleSimple.tags = ["exampleOracleSimple"];