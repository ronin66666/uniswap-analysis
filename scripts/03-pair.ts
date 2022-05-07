import { deployments, ethers, getNamedAccounts } from "hardhat";
import { UniswapV2Factory, UniswapV2Pair } from "../typechain";

//获取交易对
export async function getPair(tokenA: string, tokenB: string) {
    const factory = await ethers.getContract<UniswapV2Factory>("UniswapV2Factory");
    const pair = await factory.getPair(tokenA, tokenB);
    console.log("pair: ", pair);
    return pair;
}   

export async function pairApprove(who:string, spender: string, pair: string) {
    const pairContract = await ethers.getContractAt<UniswapV2Pair>("UniswapV2Pair", pair, who);
    const result = await pairContract.approve(spender, ethers.constants.MaxUint256).then(tx => tx.wait());
    console.log("approve success");

}
//获取库存量
export async function getReserves(pair: string) {
    const pairContract = await ethers.getContractAt<UniswapV2Pair>("UniswapV2Pair", pair);
    const result = await pairContract.getReserves();
    const reserve0 = ethers.utils.formatEther(result._reserve0);
    const reserve1 = ethers.utils.formatEther(result._reserve1);
    const blockTimestampLast = result._blockTimestampLast;
    console.log(`reserve0 = ${reserve0}  reserve1 = ${reserve1} blockTimestampLast = ${blockTimestampLast}`);
}

//获取交易对总令牌
export async function totalSupply(pair: string) {
    const pairContract = await ethers.getContractAt<UniswapV2Pair>("UniswapV2Pair", pair);
    const result = await pairContract.totalSupply();
    const totalSupply = ethers.utils.formatEther(result);
    console.log(`totalSupply = ${totalSupply}`);
}

//获取流动令牌数量
export async function getLiquidity(who: string, pair: string) {
    const pairContract = await ethers.getContractAt<UniswapV2Pair>("UniswapV2Pair", pair);
    const result = await pairContract.balanceOf(who);
    const myLiquidity = ethers.utils.formatEther(result);
    console.log(`myLiquidity = ${myLiquidity}`);
    return result;
}

// async function test() {

//     const { deployer, user1 } = await getNamedAccounts();
//     const tokenAAddr = (await deployments.get("TokenAERC20")).address;
//     const tokenBAddr = (await deployments.get("TokenBERC20")).address;

//     //获取交易对
//     const pair =  await getPair(tokenAAddr, tokenBAddr);
//     //首次添加流动性总令牌为：1414213.562373095048801688（单位eth）
//     await totalSupply(pair);
//     //实际拥有：1414213.562373095048800688， 少了（1000（wei））被永久锁定(仅限第一次添加时锁定)
//     await getLiquidity(deployer, pair);
// }


// test().catch((error) => {
//     console.log(error);
//     process.exit(1);
// })