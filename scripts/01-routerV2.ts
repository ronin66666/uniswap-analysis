import { use } from "chai";
import { deployContract } from "ethereum-waffle";
import { BigNumberish, providers } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { deployments, ethers, getNamedAccounts } from "hardhat";
import tokenA from "../deploy/02-TokenA";
import { ExampleOracleSimple, ExampleSwapToPrice, TokenAERC20, TokenBERC20, UniswapV2Factory, UniswapV2Pair, UniswapV2Router02 } from "../typechain";
import { getLiquidity, getPair, pairApprove } from "./03-pair";
import { blanceOf } from "./04-token";
import { advanceTime } from "./delay";
import { getAfterTime } from "./utils";

// tokenA和tokenB授权
async function approveRouter(who: string) {
    const spender = (await deployments.get("UniswapV2Router02")).address
    await approve(who, spender);
}

async function approve(owner: string, spender: string) {
    const tokenA = await ethers.getContract<TokenAERC20>("TokenAERC20", owner);
    const tokenB = await ethers.getContract<TokenBERC20>("TokenBERC20", owner);

    const approveAmount = ethers.constants.MaxUint256;

    const tokenAApprove = await tokenA.approve(spender, approveAmount).then(tx => tx.wait());
    console.log("tokenA approve success = ");
    
    const tokenBApprove = await tokenB.approve(spender, approveAmount).then(tx => tx.wait());
    console.log("tokenB approve success = ");

}

//添加流动性
async function addLiquidity(tokenA:string, tokenB: string, amountA: BigNumberish, amountB: BigNumberish, owner: string) {
    const router = await ethers.getContract<UniswapV2Router02>("UniswapV2Router02", owner);
   
    const deadline = getAfterTime(30 * 600); //有效期30分钟

    const result = await router.addLiquidity(
        tokenA,
        tokenB,
        amountA,
        amountB,
        0,
        0,
        owner,
        deadline
    ).then(tx => tx.wait());

    console.log("addLiquidity success ");  
} 

async function removeLiquidity(tokenA:string, tokenB: string, liquidity: BigNumberish, owner: string) {
    const router = await ethers.getContract<UniswapV2Router02>("UniswapV2Router02", owner);
    const deadline = getAfterTime(10 * 600); //有效期30分钟
    const result = await router.removeLiquidity(
        tokenA,
        tokenB,
        liquidity,
        0,
        0,
        owner,
        deadline
    ).then(tx => tx.wait());

    console.log("removeLiquidity success ");  
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

//兑换
async function swapExactTokensForTokens(
    who: string,
    amountIn: BigNumberish, 
    amountOutMin: BigNumberish,
    path: string[],
    ) {
        const router = await ethers.getContract<UniswapV2Router02>("UniswapV2Router02", who);
        const result = await router.swapExactTokensForTokens(amountIn, amountOutMin, path, who, getAfterTime(10 * 600)).then(tx => tx.wait());
        // console.log(result);
        console.log("swap success");
        
    }

async function getBalance(who: string) {
    const tokenAAddr = (await deployments.get("TokenAERC20")).address;
    const tokenBAddr = (await deployments.get("TokenBERC20")).address;
    await blanceOf(who , tokenAAddr);
    await blanceOf(who , tokenBAddr);
}

//更新时间加权价格
async function oracleUpdate() {
    
    const oracle = await ethers.getContract<ExampleOracleSimple>("ExampleOracleSimple");
    const result = await oracle.update().then(tx => tx.wait());
    console.log("价格更新成功");
    
    // console.log(result);
    
}

//获取当前价格
async function printTWAPPrice() {
    const oracle = await ethers.getContract<ExampleOracleSimple>("ExampleOracleSimple");
    const tokenAAddr = (await deployments.get("TokenAERC20")).address;
    let amount = await oracle.consult(tokenAAddr, ethers.utils.parseUnits("1", 18));
    console.log("时间加权价格: 1 A = " +  ethers.utils.formatUnits(amount, 18) + " B");
}


async function main() {
    const { deployer, user1 } = await getNamedAccounts();

    //授权
    // await approveRouter(user1);
    // await addLiquidityTest(user1);
    // await swapTest();

    await removeLiquidityTest(user1);

}

async function addLiquidityTest(who: string) {
    const tokenAAddr = (await deployments.get("TokenAERC20")).address;
    const tokenBAddr = (await deployments.get("TokenBERC20")).address;

     //首次添加流动性，会永久锁定MINIMUM_LIQUIDITY（10**3）个令牌
    //if (_totalSupply == 0) {
    //     liquidity = Math.sqrt(amount0.mul(amount1)).sub(MINIMUM_LIQUIDITY);
    //     _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
    //  }
    await addLiquidity(tokenAAddr,tokenBAddr, ethers.utils.parseEther("10000"), ethers.utils.parseEther("20000"), who);
    const pair = await getPair(tokenAAddr, tokenBAddr);

    const liquidity = await getLiquidity(who, pair);
    console.log("get liquidity = ", ethers.utils.formatEther(liquidity));
}

async function swapTest() {
    const { deployer, user1 } = await getNamedAccounts();
    const tokenAAddr = (await deployments.get("TokenAERC20")).address;
    const tokenBAddr = (await deployments.get("TokenBERC20")).address;

    await printShotPrice(ethers.utils.parseEther("1"),[tokenAAddr, tokenBAddr]);
    await getBalance(user1);

    //兑换 A -> B
    await swapExactTokensForTokens(user1, ethers.utils.parseEther("1000"), 0, [tokenAAddr, tokenBAddr])
    await getBalance(user1);
    await printShotPrice(ethers.utils.parseEther("1"),[tokenAAddr, tokenBAddr]);

    //B -> A
    await advanceTime(ethers.provider, 600);
    await swapExactTokensForTokens(user1, ethers.utils.parseEther("2000"), 0, [tokenBAddr, tokenAAddr]);
    await getBalance(user1);
    await printShotPrice(ethers.utils.parseEther("1"),[tokenAAddr, tokenBAddr]);
    
    await advanceTime(ethers.provider, 1200);
    await swapExactTokensForTokens(user1, ethers.utils.parseEther("3000"), 0, [tokenBAddr, tokenAAddr]);
    await getBalance(user1);
    await printShotPrice(ethers.utils.parseEther("1"),[tokenAAddr, tokenBAddr]);
    
    await advanceTime(ethers.provider, 1200);
    await oracleUpdate();
    await printTWAPPrice();
}


async function removeLiquidityTest(who: string) {
    const tokenAAddr = (await deployments.get("TokenAERC20")).address;
    const tokenBAddr = (await deployments.get("TokenBERC20")).address;

    const pair = await getPair(tokenAAddr, tokenBAddr);

    const routerAddr = (await deployments.get("UniswapV2Router02")).address
    await pairApprove(who, routerAddr, pair);

    const liquidity = await getLiquidity(who, pair);
    console.log("liquidity = ", ethers.utils.formatEther(liquidity));

    await getBalance(who)
    await removeLiquidity(tokenAAddr, tokenBAddr, ethers.utils.parseEther("10000") , who);
    await getBalance(who)

}


main().catch((error) => {
    console.log(error);
    process.exit(1);
})

