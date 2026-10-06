import { mkdir, writeFile } from "node:fs/promises";

const urls = [
  "https://study.unimelb.edu.au/find/courses/graduate/master-of-computer-science/",
  "https://study.unimelb.edu.au/find/courses/graduate/master-of-data-science/",
  "https://study.unimelb.edu.au/find/courses/graduate/master-of-information-technology/",
  "https://programsandcourses.anu.edu.au/program/MCOMP",
  "https://programsandcourses.anu.edu.au/program/MMLCV",
  "https://www.unsw.edu.au/study/postgraduate/master-of-information-technology",
  "https://www.sydney.edu.au/courses/courses/pc/master-of-data-science.html",
  "https://www.sydney.edu.au/courses/courses/pc/master-of-information-technology.html",
  "https://study.uq.edu.au/study-options/programs/master-computer-science-5522",
  "https://study.uq.edu.au/study-options/programs/master-data-science-5660",
  "https://www.monash.edu/study/courses/find-a-course/artificial-intelligence-c6007",
  "https://www.monash.edu/study/courses/find-a-course/cybersecurity-c6004",
  "https://www.adelaide.edu.au/degree-finder/mcsc_mcompsc.html",
  "https://www.rmit.edu.au/study-with-us/levels-of-study/postgraduate-study/masters-by-coursework/master-of-artificial-intelligence-mc274",
  "https://www.uts.edu.au/courses/master-of-data-science-and-innovation",
  "https://www.uwa.edu.au/study/courses/master-of-data-science",
  "https://masterdatascience.ubc.ca/",
  "https://mscac.utoronto.ca/",
  "https://uwaterloo.ca/future-graduate-students/programs/by-faculty/mathematics/data-science-and-artificial-intelligence-mdsai",
  "https://www.cs.mcgill.ca/academic/graduate/msc/",
  "https://www.ualberta.ca/en/computing-science/graduate-studies/programs-and-admissions/msc-program.html",
  "https://www.sfu.ca/computing/prospective-students/graduate-students/programs/professional-master-of-science.html",
  "https://www.uottawa.ca/faculty-engineering/graduate-studies/programs/masters/computer-science",
  "https://graduate.carleton.ca/program/computer-science/",
  "https://www.concordia.ca/academics/graduate/computer-science-mcomp-sc.html",
  "https://www.dal.ca/faculty/computerscience/graduate-programs/macs.html",
];

function decode(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&pound;|&#163;/g, "£")
    .replace(/&euro;|&#8364;/g, "€")
    .replace(/&#36;|&dollar;/g, "$")
    .replace(/&#39;|&apos;|&rsquo;/g, "'")
    .replace(/&ndash;|&#8211;/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

const phrases = [
  "international",
  "tuition",
  "IELTS",
  "TOEFL",
  "indicative",
  "fee",
  "February",
  "July",
  "September",
  "duration",
  "1.5 year",
  "2 year",
  "credit",
  "honours",
  "GPA",
  "bachelor",
  "A$",
  "C$",
  "$",
];

function windows(text, phrase, limit = 3) {
  const lower = text.toLowerCase();
  const needle = phrase.toLowerCase();
  const found = [];
  let from = 0;
  while (found.length < limit) {
    const at = lower.indexOf(needle, from);
    if (at < 0) break;
    found.push(text.slice(Math.max(0, at - 80), at + 220));
    from = at + needle.length;
  }
  return found;
}

await mkdir("data/raw", { recursive: true });
const out = [];
for (let i = 0; i < urls.length; i += 4) {
  const batch = await Promise.all(
    urls.slice(i, i + 4).map(async (url) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 18000);
      try {
        const response = await fetch(url, {
          redirect: "follow",
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; GradGuideCompass/1.0)",
            Accept: "text/html",
          },
        });
        const text = decode(await response.text());
        const hits = [];
        for (const phrase of phrases) {
          for (const window of windows(text, phrase, phrase === "$" ? 4 : 2)) {
            hits.push(window);
          }
        }
        return {
          status: response.status,
          finalUrl: response.url,
          length: text.length,
          title: text.slice(0, 180),
          hits: hits.slice(0, 18),
        };
      } catch (error) {
        return {
          status: 0,
          finalUrl: url,
          length: 0,
          title: "",
          hits: [error instanceof Error ? error.message : "fail"],
        };
      } finally {
        clearTimeout(timer);
      }
    }),
  );
  for (const item of batch) {
    out.push(item);
    console.log("\n==", item.status, item.finalUrl, "len", item.length);
    console.log(item.title.slice(0, 160));
  }
}
await writeFile("data/raw/au-ca.json", JSON.stringify(out, null, 2));
console.log("\nwritten", out.length);
