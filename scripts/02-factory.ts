import { ethers } from "hardhat";
import { UniswapV2Factory } from "../typechain";

//获取计算交易对合约的init_code
export async function getInitCode() {
    const factory = await ethers.getContract<UniswapV2Factory>("UniswapV2Factory");
    const hash = await factory.INIT_CODE_PAIR_HASH();
    console.log(hash);
}



async function test() {
 
    
}


test().catch((error) => {
    console.log(error);
    process.exit(1);
})
