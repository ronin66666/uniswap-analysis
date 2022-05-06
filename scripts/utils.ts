import { ethers } from "hardhat";


//返回秒数
export  function getAfterTime(timeStamp: number): number {
   
    const curretTime =  Math.ceil(Date.now() / 1000); 
    console.log("currentTime = ", curretTime);
    const afterTime = curretTime + timeStamp;
    return afterTime;
}





// async function main() {

//     //10分钟后
//     const aftertime = getAfterTime(10 * 60);
//     console.log(aftertime);
    
// }

// main().catch(error => console.log(error))

