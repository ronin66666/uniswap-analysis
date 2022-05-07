import { deployments, getNamedAccounts } from "hardhat";



// 需要先有对应的交易对才能部署成功，部署前先添加对应的流动性
export default async function exampleOracleSimple() {
    const { deployer } = await getNamedAccounts();

    const factoryAddress = (await deployments.get("UniswapV2Factory")).address;
    const tokenAAddr = (await deployments.get("TokenAERC20")).address;
    const tokenBAddr = (await deployments.get("TokenBERC20")).address;
    console.log(`factory = ${factoryAddress} tokenAAddr = ${tokenAAddr} tokenBAddr = ${tokenBAddr}`);
    
    const result = await deployments.deploy("ExampleOracleSimple", {
        contract: "ExampleOracleSimple",
        from: deployer,
        log: true,
        args: [factoryAddress, tokenAAddr, tokenBAddr] //初始化deployer为交易费管理员
    });

    console.log("exampleOracleSimple address = ", result.address);
}

exampleOracleSimple.tags = ["exampleOracleSimple"];