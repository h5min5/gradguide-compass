import { writeFile } from "node:fs/promises";

const urls = [
  "https://programsandcourses.anu.edu.au/program/MMLCV",
  "https://www.unsw.edu.au/study/postgraduate/master-of-information-technology",
  "https://www.unsw.edu.au/study/postgraduate/master-of-data-science",
  "https://www.unsw.edu.au/study/postgraduate/master-of-cyber-security",
  "https://study.uq.edu.au/study-options/programs/master-computer-science-5522",
  "https://study.uq.edu.au/study-options/programs/master-data-science-5660",
  "https://www.uts.edu.au/courses/master-of-data-science-and-innovation",
  "https://www.uts.edu.au/courses/master-of-information-technology",
  "https://www.uow.edu.au/study/courses/master-of-computer-science/",
  "https://www.deakin.edu.au/course/master-artificial-intelligence",
  "https://www.mq.edu.au/study/find-a-course/courses/master-of-information-technology",
  "https://www.qut.edu.au/courses/master-of-data-analytics",
  "https://www.griffith.edu.au/study/degrees/master-of-information-technology-5648",
  "https://www.curtin.edu.au/study/offering/course-pg-master-of-computing--mc-comp",
  "https://masterdatascience.ubc.ca/tuition-financial-aid",
  "https://masterdatascience.ubc.ca/admissions/prerequisites",
  "https://www.grad.ubc.ca/prospective-students/graduate-degree-programs/master-of-data-science",
  "https://mscac.utoronto.ca/program",
  "https://web.cs.toronto.edu/graduate/programs",
  "https://uwaterloo.ca/future-graduate-students/programs/computer-science-mmath",
  "https://uwaterloo.ca/graduate-studies-academic-calendar/mathematics/computer-science-master-mathematics-computer-science",
  "https://www.mcgill.ca/study/2026-2027/faculties/science/graduate/programs/master-science-msc-computer-science",
  "https://www.ualberta.ca/computing-science/graduate-studies/msc.html",
  "https://www.sfu.ca/computing/future-students/graduate/programs/professional-masters.html",
  "https://www.uottawa.ca/study/graduate-studies/masters/computer-science",
  "https://www.concordia.ca/academics/graduate/computer-science.html",
  "https://www.dal.ca/faculty/computerscience/programs/graduate.html",
  "https://www.cs.queensu.ca/graduate/",
  "https://grad.ucalgary.ca/future-students/explore-programs/computer-science-msc",
  "https://umanitoba.ca/explore/programs-of-study/computer-science-msc",
];

function decode(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#36;|&dollar;/g, "$")
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/g, "'")
    .replace(/&ndash;|&#8211;|&mdash;/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

const phrases = ["IELTS", "TOEFL", "international tuition", "indicative fee for international", "Annual indicative fee for international", "bachelor", "GPA", "WAM", "cognate", "entry requirement", "CRICOS", "duration", "Semester 1", "Fall", "September"];

function windows(text, phrase) {
  const lower = text.toLowerCase();
  const needle = phrase.toLowerCase();
  const found = [];
  let from = 0;
  while (found.length < 2) {
    const at = lower.indexOf(needle, from);
    if (at < 0) break;
    found.push(text.slice(Math.max(0, at - 100), Math.min(text.length, at + 320)));
    from = at + needle.length;
  }
  return found;
}

const out = [];
for (let i = 0; i < urls.length; i += 5) {
  const batch = await Promise.all(
    urls.slice(i, i + 5).map(async (url) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 18000);
      try {
        const response = await fetch(url, {
          redirect: "follow",
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; GradGuideCompass/1.0)", Accept: "text/html" },
        });
        const text = decode(await response.text());
        const hits = phrases.flatMap((phrase) => windows(text, phrase));
        return { status: response.status, requested: url, finalUrl: response.url, length: text.length, title: text.slice(0, 140), hits: hits.slice(0, 16) };
      } catch (error) {
        return { status: 0, requested: url, finalUrl: url, length: 0, title: "", hits: [error instanceof Error ? error.message : "fail"] };
      } finally {
        clearTimeout(timer);
      }
    }),
  );
  for (const item of batch) {
    out.push(item);
    console.log(item.status, item.length, item.finalUrl);
  }
}
await writeFile("data/raw/au-ca-2.json", JSON.stringify(out, null, 2));
console.log("written", out.length);
