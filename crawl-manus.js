import puppeteer from "puppeteer";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import winston from "winston";
import path from "path";

// 로거 설정
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`
    )
  ),
  transports: [
    new winston.transports.File({ filename: "instagram_crawler.log" }),
    new winston.transports.Console(),
  ],
});

// 브라우저 설정 및 실행
async function setupBrowser(headless = true) {
  logger.info(`브라우저 설정 중 (Headless: ${headless})`);
  try {
    const browser = await puppeteer.launch({
      headless: headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // Sandbox 비활성화 (필요시)
    });
    logger.info("브라우저 실행 완료");
    return browser;
  } catch (error) {
    logger.error(`브라우저 실행 실패: ${error}`);
    throw error;
  }
}

// 인스타그램 프로필 크롤링
async function crawlProfile(username, headless = true) {
  let browser;
  try {
    browser = await setupBrowser(headless);
    const page = await browser.newPage();
    const url = `https://www.instagram.com/${username}/`;
    logger.info(`${username} 프로필 페이지로 이동: ${url}`);

    await page.goto(url, { waitUntil: "networkidle2" });
    logger.info("페이지 로딩 완료");

    // 로그인 팝업 등 방해 요소 처리 (필요시)
    // 예: await page.click('button_selector_for_closing_popup');

    // 프로필 정보 추출 (셀렉터는 인스타그램 구조 변경에 따라 달라질 수 있음)
    logger.info("프로필 정보 추출 시작");
    const profileData = await page.evaluate((username) => {
      const data = { username: username };
      try {
        // 예시 셀렉터 (실제 인스타그램 구조 확인 필요)
        const headerElements = document.querySelectorAll(
          "header section ul li span"
        ); // 팔로워, 팔로잉, 게시물 수
        if (headerElements && headerElements.length >= 3) {
          console.log(headerElements)
          data.posts = headerElements[0]?.innerText || "N/A";
          data.followers = headerElements[1]?.innerText || "N/A";
          data.following = headerElements[2]?.innerText || "N/A";
        }

        const bioElement = document.querySelector("header section div > span"); // 자기소개
        data.bio = bioElement?.innerText.replace(/\n/g, " ") || "N/A";

        const nameElement = document.querySelector("header section h1"); // 이름 (사용자 이름과 다를 수 있음)
        data.name = nameElement?.innerText || "N/A";
      } catch (e) {
        console.error("프로필 데이터 추출 중 오류:", e);
      }
      return data;
    }, username);

    logger.info("프로필 정보 추출 완료");
    logger.info(`추출된 데이터: ${JSON.stringify(profileData)}`);
    return profileData;
  } catch (error) {
    logger.error(`크롤링 중 오류 발생 (${username}): ${error}`);
    return null;
  } finally {
    if (browser) {
      await browser.close();
      logger.info("브라우저 종료");
    }
  }
}

// 메인 실행 함수
async function main() {
  const profileData = await crawlProfile('cohete.lab', true);
  if (profileData) {
    logger.info("크롤링 성공");
    // TODO: 추출된 데이터를 DB나 파일에 저장하는 로직 추가
    console.log("\n--- 추출된 프로필 정보 ---");
    console.log(JSON.stringify(profileData, null, 2));
    console.log("-------------------------");
  } else {
    logger.error("크롤링 실패");
  }

  logger.info("크롤링 프로세스 종료");
}

main();
