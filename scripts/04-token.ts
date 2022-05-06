import { BigNumberish } from "ethers";
import { getNamedAccounts, deployments, ethers } from "hardhat";
import { TokenAERC20 } from "../typechain";

export async function transferFrom(tokenAddress:string, from: string, to: string, amount: BigNumberish) {
    const tokenA = await ethers.getContractAt<TokenAERC20>("TokenAERC20", tokenAddress, from);
    const result = await tokenA.transfer(to, amount).then(tx => tx.wait());
    console.log(result);
}

export async function blanceOf(who:string, tokenAddress: string) {
    const tokenA = await ethers.getContractAt<TokenAERC20>("TokenAERC20", tokenAddress);
    const balance = await tokenA.balanceOf(who);
    const balanceStr = ethers.utils.formatEther(balance);
    console.log("balance = ", balanceStr);
    
}

// async function test() {

//     const { deployer, user1 } = await getNamedAccounts();
//     const tokenAAddr = (await deployments.get("TokenAERC20")).address;
//     const tokenBAddr = (await deployments.get("TokenBERC20")).address;

//     //转账A
//     await transferFrom(tokenAAddr, deployer, user1, ethers.utils.parseEther("200000"));
//     await blanceOf(user1, tokenAAddr);

//     //转账B
//     await transferFrom(tokenBAddr, deployer, user1, ethers.utils.parseEther("500000"));
//     await blanceOf(user1, tokenBAddr);
// }


// test().catch((error) => {
//     console.log(error);
//     process.exit(1);
// })