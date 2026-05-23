import axios from "axios";
import * as cheerio from "cheerio";
import { v1_base_url } from "../utils/base_v1.js";
import { DEFAULT_HEADERS } from "../configs/header.config.js";

const axiosInstance = axios.create({
  headers: DEFAULT_HEADERS,
  timeout: 15000,
});

async function extractPage(page, params) {
  try {
    const url = `https://${v1_base_url}/${params}?page=${page}`;

    console.log("Fetching:", url);

    const resp = await axiosInstance.get(url);

    const $ = cheerio.load(resp.data);

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

    const animeElements = $(".film_list-wrap .flw-item");

    console.log("Found items:", animeElements.length);

    const data = animeElements
      .map((index, element) => {
        try {
          const href =
            $(".film-poster > a", element).attr("href") || "";

          const id = href
            .split("/")
            .pop()
            ?.split("?")[0] || "";

          const data_id =
            $(".film-poster > a", element).attr("data-id") || "";

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
          console.error("Item parse error:", err);
          return null;
        }
      })
      .get()
      .filter(Boolean);

    console.log("Extracted:", data.length);

    return [data, parseInt(totalPages, 10)];
  } catch (error) {
    console.error(`Error extracting data from page ${page}:`, error.message);

    return [[], 1];
  }
}

export default extractPage;
