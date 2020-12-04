const fs = require('fs');
const path = require('path');
const iniparser = require('iniparser');
const puppeteer = require('puppeteer');
const {randomic} = require('./randomic');


// 유저 에이전트
const ua = [
    `Mozilla/5.0 (iPod; U; CPU iPhone OS 3_1_3 like Mac OS X; ko-kr) AppleWebKit/528.18 (KHTML, like Gecko) Version/4.0 Mobile/7E18 Safari/528.16`,
    `Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1`,
    `Mozilla/5.0 (Linux; U; Android 2.1-update1; ko-kr; Nexus One Build/ERE27) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Mobile Safari/530.17`,
    `Mozilla/5.0 (Linux; U; Android 4.0.3; ko-kr; LG-L160L Build/IML74K) AppleWebkit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30`,
    `Mozilla/5.0 (Linux; U; Android 2.3.3; ko-kr; LG-LU3000 Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1`,
    `Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Mobile Safari/537.36`,
    `Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Mobile Safari/537.36`
];

let browserList = [];

// 아이피 추출
(async ()=>
{
    // 크로미움 엔진 다운로드
    //path replace
    const download = require('download-chromium');
    const os = require('os');
    const tmp = os.tmpdir();
    
    const exec = await download({
        revision: 722234,
        installPath: `${tmp}/.local-chromium`});

    let ipList = [];
    let actList = [];
    let config = null;

    try{
        config = iniparser.parseSync('config.ini');
        console.log(config);

    }catch(e)
    {
        console.log('config.ini 파일이 없습니다.');
    }
    const {url, session} = config;
    let {createTime, minTime, maxTime} = config;

    // 이미터 에러방지
    process.setMaxListeners(parseInt(session));

    // 시간들은 1000씩 곱해서 초단위로 만들어줌
    createTime *= 1000;
    const initCreateTime = createTime;
    minTime *= 1000;
    maxTime *= 1000;

    try
    {
        const ip = await fs.readFileSync('proxy.txt').toString('utf-8');
        ipList = ip.split('\r\n');
        console.log('프록시 ip 읽기 성공');
        console.log(`프록시 ip 갯수 : ${ipList.length}`);

    }catch(e)
    {
        console.log('ip파일 읽어오기에 실패했습니다.');
        return -1;
    }

    for(let i=0;i<session;i++)
    {

        // 지정된 시간마다 생성
        setTimeout(async ()=>
        {
            // 프록시 주소 배정
            let proxyAddr = ipList[randomic(0, ipList.length - 1)];
            // 주소 배정 후 중복확인
            while(actList.includes(proxyAddr))
            {
                proxyAddr = ipList[randomic(0, ipList.length - 1)];
            }
            actList.push(proxyAddr);

            console.log(`${i + 1}번째 세션 : ${proxyAddr} 시작`);

            // 실제 사이트에 머무는 순간
            const browser = await puppeteer.launch({
                headless:true,
                args:[`--proxy-server=${proxyAddr}`],
                executablePath: exec,
                headless:true
            });

            let page = null;

            try{
                page = await browser.newPage();
                await page.setUserAgent(ua[randomic(0, ua.length - 1)]);
                await page.goto(url, {timeout:0});

            }catch(e)
            {
                console.log('연결에 너무 오랜시간이 소요되거나 유효한 주소, ip가 아닙니다.\n 이 세션은 종료됩니다.');
                await browser.close();
                return;
            }
            
            browserList.push(browser);

            // 실행 후 체류시간 후 종료
            setTimeout(async ()=>
            {
                (async(closeObj, ip, pageObj, number)=>
                {
                    //index값이 0부터 시작하므로
                    number += 1;

                    const ipIndex = actList.indexOf(ip);
                    if(ipIndex > -1) actList = actList.slice(ipIndex, 0);
                    console.log(`${number}번째 세션 : ${ip} 종료`);
    
                    // await pageObj.screenshot({path:`example${i}.png`});
    
                    await closeObj.close();
                    
                })(browser, proxyAddr, page, i);
            }, (randomic(minTime, maxTime)))

        }, createTime);
        createTime += initCreateTime;
    }


})();


// 프로그램 (강제)종료 시
process.on('exit', async ()=>
{
    browserList.pop();
    while(true)
    {
        const browser = browserList.pop();
        if(browser === undefined) break; 
        await browser.close();
    }

});