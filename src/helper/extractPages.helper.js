import * as cheerio from "cheerio";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import chromium from "@sparticuz/chromium";

import { v1_base_url } from "../utils/base_v1.js";

puppeteer.use(StealthPlugin());

async function extractPage(page, params) {
  try {
    const url = `https://${v1_base_url}/${params}?page=${page}`;

    console.log("Fetching URL:", url);

    const browser = await puppeteer.launch({
      args: [...chromium.args, "--no-sandbox"],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const pageObj = await browser.newPage();

    await pageObj.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
    );

    await pageObj.setExtraHTTPHeaders({
      "accept-language": "en-US,en;q=0.9",
    });

    await pageObj.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await new Promise((resolve) => setTimeout(resolve, 8000));

    const html = await pageObj.content();

    console.log("HTML DEBUG START");
    console.log(html.slice(0, 10000));
    console.log("HTML DEBUG END");

    await browser.close();

    const $ = cheerio.load(html);

    const totalPages =
      Number(
        $('.pre-pagination nav .pagination > .page-item a[title="Last"]')
          ?.attr("href")
          ?.split("=")
          .pop() ??
          $('.pre-pagination nav .pagination > .page-item a[title="Next"]')
            ?.attr("href")
            ?.split("=")
            .pop() ??
          $(".pre-pagination nav .pagination > .page-item.active a")
            ?.text()
            ?.trim()
      ) || 1;

    const animeElements =
      $(".film_list-wrap .flw-item").length > 0
        ? $(".film_list-wrap .flw-item")
        : $(".flw-item");

    console.log("FOUND ITEMS:", animeElements.length);

    const data = animeElements
      .map((index, element) => {
        try {
          const anchor = $(".film-poster a", element);

          const href = anchor.attr("href") || "";

          const id =
            href
              .replace(/^https?:\/\/[^/]+/i, "")
              .split("/")
              .filter(Boolean)
              .pop()
              ?.split("?")[0]
              ?.trim() || "";

          const data_id = anchor.attr("data-id") || "";

          const poster =
            $(".film-poster img", element).attr("data-src") ||
            $(".film-poster img", element).attr("src") ||
            "";

          const title =
            $(".film-detail .film-name", element)
              .text()
              .trim() ||
            $(".dynamic-name", element)
              .text()
              .trim() ||
            "";

          const japanese_title =
            $(".film-detail .film-name a", element).attr("data-jname") ||
            "";

          const description =
            $(".film-detail .description", element)
              .text()
              .trim() || "";

          const showType =
            $(".fdi-item", element)
              .first()
              .text()
              .trim() || "Unknown";

          const duration =
            $(".fdi-duration", element)
              .text()
              .trim() || "";

          const tvInfo = {
            showType,
            duration,
          };

          ["sub", "dub", "eps"].forEach((property) => {
            const value = $(`.tick-${property}`, element)
              .text()
              .trim();

            if (value) {
              tvInfo[property] = value;
            }
          });

          const adultContent = $(element)
            .text()
            .includes("18+");

          return {
            id,
            data_id,
            poster,
            title,
            japanese_title,
            description,
            tvInfo,
            adultContent,
          };
        } catch (err) {
          console.error("ITEM PARSE ERROR:", err);
          return null;
        }
      })
      .get()
      .filter(Boolean);

    console.log("EXTRACTED ITEMS:", data.length);
    console.log("FIRST ITEM:", data[0]);

    return [data, parseInt(totalPages, 10)];
  } catch (error) {
    console.error(`Error extracting data from page ${page}:`, error.message);

    return [[], 1];
  }
}

export default extractPage;