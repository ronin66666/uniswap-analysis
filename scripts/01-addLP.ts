import { BigNumberish } from "ethers";
import { deployments, ethers, getNamedAccounts } from "hardhat";
import { ExampleOracleSimple, TokenAERC20, TokenBERC20, UniswapV2Factory, UniswapV2Router02 } from "../typechain";
import { getAfterTime } from "./utils";

//tokenA和tokenB授权
async function approveRouter() {
    const { deployer, user1 } = await getNamedAccounts();
    const spender = (await deployments.get("UniswapV2Router02")).address
    await approve(deployer, spender);
}

async function approve(owner: string, spender: string) {
    const tokenA = await ethers.getContract<TokenAERC20>("TokenAERC20", owner);
    const tokenB = await ethers.getContract<TokenBERC20>("TokenBERC20", owner);

    const approveAmount = ethers.constants.MaxUint256;

    const tokenAApprove = await tokenA.approve(spender, approveAmount).then(tx => tx.wait());
    console.log("tokenA approve result = ", tokenAApprove);
    
    const tokenBApprove = await tokenB.approve(spender, approveAmount).then(tx => tx.wait());
    console.log("tokenB approve result = ", tokenBApprove);

}

//添加流动性
async function addLiquidity(amountA: BigNumberish, amountB: BigNumberish, owner: string) {
    const router = await ethers.getContract<UniswapV2Router02>("UniswapV2Router02", owner);
    const tokenAAddr = (await deployments.get("TokenAERC20")).address;
    const tokenBAddr = (await deployments.get("TokenBERC20")).address;

    const deadline = getAfterTime(30 * 60); //有效期30分钟

    const result = await router.addLiquidity(
        tokenAAddr,
        tokenBAddr,
        amountA,
        amountB,
        0,
        0,
        owner,
        deadline
    ).then(tx => tx.wait());

    console.log("addLiquidity ", result);  
} 

async function printShotPrice(tokenA: string, tokenB: string) {
    const { deployer, user1 } = await getNamedAccounts();

    const tokenAAddr = (await deployments.get("TokenAERC20")).address;
    const tokenBAddr = (await deployments.get("TokenBERC20")).address;

    const router = await ethers.getContract<UniswapV2Router02>("UniswapV2Router02", deployer);

    const amounts = await router.getAmountsOut(ethers.utils.parseEther("1"), [tokenAAddr, tokenBAddr]);

    //1 个 = amounts[1] 个 B
    console.log("即时价格: 1 A = " +  ethers.utils.formatEther(amounts[1]) + " B");
    
}

async function printTWAPPrice() {
    const oracle = await ethers.getContract<ExampleOracleSimple>("ExampleOracleSimple");
    const tokenAAddr = (await deployments.get("TokenAERC20")).address;
    let amount = await oracle.consult(tokenAAddr, ethers.utils.parseUnits("1", 18));
    console.log("时间加权价格: 1 A = " +  ethers.utils.formatUnits(amount, 18) + " B");
}

async function getPair(tokenA: string, tokenB: string) {
    const factory = await ethers.getContract<UniswapV2Factory>("UniswapV2Factory");
    const pair = factory.getPair(tokenA, tokenB);
    console.log("pair");
}   


//添加流动性
async function main() {
    const { deployer, user1 } = await getNamedAccounts();
    const tokenAAddr = (await deployments.get("TokenAERC20")).address;
    const tokenBAddr = (await deployments.get("TokenBERC20")).address;


    //授权
    // approveRouter();
    await addLiquidity(ethers.utils.parseEther("1000000"), ethers.utils.parseEther("2000000"), deployer);
    await getPair(tokenAAddr, tokenBAddr);
    await printShotPrice(tokenAAddr, tokenBAddr);
    
}



main().catch((error) => {
    console.log(error);
    process.exit(1);
})

