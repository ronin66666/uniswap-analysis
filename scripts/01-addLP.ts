import { BigNumberish } from "ethers";
import { deployments, ethers, getNamedAccounts } from "hardhat";
import tokenA from "../deploy/02-TokenA";
import { ExampleOracleSimple, ExampleSwapToPrice, TokenAERC20, TokenBERC20, UniswapV2Factory, UniswapV2Pair, UniswapV2Router02 } from "../typechain";
import { blanceOf } from "./04-token";
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

async function printShotPrice(amountIn: BigNumberish, path: string[]) {
    const { deployer, user1 } = await getNamedAccounts();

    const router = await ethers.getContract<UniswapV2Router02>("UniswapV2Router02", deployer);
    const amounts = await router.getAmountsOut(amountIn, path);

    //计算公式: amountA * (1 - 0.3%) * (reserveB / reserveA) = 1 * 0.997 * 2 = 1.994
    // 1 个 a 可兑换大约 1.994 个 B
    // console.log("即时价格:  A = " +  ethers.utils.formatEther(amounts[1]) + " B");
    console.log(`amountIn = ${ethers.utils.formatEther(amountIn)} 可兑换 ${ethers.utils.formatEther(amounts[1])}`);
    
}

async function printTWAPPrice() {
    const oracle = await ethers.getContract<ExampleOracleSimple>("ExampleOracleSimple");
    const tokenAAddr = (await deployments.get("TokenAERC20")).address;
    let amount = await oracle.consult(tokenAAddr, ethers.utils.parseUnits("1", 18));
    console.log("时间加权价格: 1 A = " +  ethers.utils.formatUnits(amount, 18) + " B");
}

//兑换
async function swapExactTokensForTokens(
    who: string,
    amountIn: BigNumberish, 
    amountOutMin: BigNumberish,
    path: string[],
    ) {
        const router = await ethers.getContract<UniswapV2Router02>("UniswapV2Router02", who);
        const result = await router.swapExactTokensForTokens(amountIn, amountOutMin, path, who, getAfterTime(10 * 60)).then(tx => tx.wait());
        // console.log(result);
    }

async function getBalance(who: string) {
    const tokenAAddr = (await deployments.get("TokenAERC20")).address;
    const tokenBAddr = (await deployments.get("TokenBERC20")).address;
    await blanceOf(who , tokenAAddr);
    await blanceOf(who , tokenBAddr);
}



async function main() {
    const { deployer, user1 } = await getNamedAccounts();
    const tokenAAddr = (await deployments.get("TokenAERC20")).address;
    const tokenBAddr = (await deployments.get("TokenBERC20")).address;

    //授权
    // await approveRouter();

    //首次添加流动性，会永久锁定MINIMUM_LIQUIDITY（10**3）个令牌
    //if (_totalSupply == 0) {
    //     liquidity = Math.sqrt(amount0.mul(amount1)).sub(MINIMUM_LIQUIDITY);
    //     _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
    //  }
    // await addLiquidity(ethers.utils.parseEther("1000000"), ethers.utils.parseEther("2000000"), deployer);
    // await getPair(tokenAAddr, tokenBAddr);

    //amountIn = 1 A 可兑换 1.993998011983982051 B
    await printShotPrice(ethers.utils.parseEther("1"),[tokenAAddr, tokenBAddr]);
    //兑换前：A: 200000.0 , B: 500000.0
    await getBalance(user1);

    //兑换
    await swapExactTokensForTokens(user1, ethers.utils.parseEther("1000"), 0, [tokenAAddr, tokenBAddr])

    //兑换后：A: 199000.0， B: 501992.013962079806432986, 也就是兑换了 1992.013962079806432986 个B
    await getBalance(user1);

    //amountIn = 1 A 可兑换 1.990021956071844384 B； 兑换后B的价格上升
    await printShotPrice(ethers.utils.parseEther("1"),[tokenAAddr, tokenBAddr]);


}



main().catch((error) => {
    console.log(error);
    process.exit(1);
})

