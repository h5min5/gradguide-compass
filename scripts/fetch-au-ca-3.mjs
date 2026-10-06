import { writeFile } from "node:fs/promises";

const urls = [
  "https://www.curtin.edu.au/study/offering/course-pg-master-of-computing--mc-comp/",
  "https://www.uow.edu.au/study/courses/master-of-computer-science/",
  "https://www.grad.ubc.ca/prospective-students/graduate-degree-programs/master-of-data-science",
  "https://masterdatascience.ubc.ca/admissions/prerequisites",
  "https://umanitoba.ca/graduate-studies/admissions/programs-of-study/computer-science-msc",
  "https://graduate.carleton.ca/program/computer-science-masters-programs/",
  "https://www.uvic.ca/graduate/programs/graduate-programs/computer-science/index.php",
  "https://www.cs.ubc.ca/students/grad/graduate-programs",
  "https://www.sfu.ca/computing/future-students/graduate.html",
  "https://www.yorku.ca/science/grad/computer-science/",
  "https://www.torontomu.ca/graduate/programs/computer-science-msc/",
  "https://brocku.ca/programs/graduate/computer-science/",
  "https://www.queensu.ca/sgs/programs-degrees/computer-science",
  "https://www.uwo.ca/sci/graduate/future_students/programs/computer_science.html",
  "https://www.mcgill.ca/cs/graduate",
  "https://calendar.uwaterloo.ca/graduate-studies-academic-calendar/mathematics/computer-science",
  "https://www.ualberta.ca/en/science/programs/graduate/computing-science.html",
  "https://www.concordia.ca/ginacody/computer-science-software-eng/programs/graduate/master-applied-computer-science.html",
  "https://www.dal.ca/academics/programs/graduate/computer-science.html",
  "https://www.mun.ca/computerscience/graduate/",
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

const phrases = ["IELTS", "TOEFL", "international", "tuition", "$", "C$", "bachelor", "GPA", "September", "February", "Winter", "Fall", "duration", "indicative"];

function windows(text, phrase) {
  const lower = text.toLowerCase();
  const needle = phrase.toLowerCase();
  const found = [];
  let from = 0;
  while (found.length < 2) {
    const at = lower.indexOf(needle, from);
    if (at < 0) break;
    found.push(text.slice(Math.max(0, at - 90), Math.min(text.length, at + 260)));
    from = at + needle.length;
  }
  return found;
}

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
          headers: { "User-Agent": "Mozilla/5.0 (compatible; GradGuideCompass/1.0)", Accept: "text/html" },
        });
        const text = decode(await response.text());
        return {
          status: response.status,
          finalUrl: response.url,
          length: text.length,
          title: text.slice(0, 120),
          hits: phrases.flatMap((phrase) => windows(text, phrase)).slice(0, 14),
        };
      } catch (error) {
        return { status: 0, finalUrl: url, length: 0, title: "", hits: [error instanceof Error ? error.message : "fail"] };
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
await writeFile("data/raw/au-ca-3.json", JSON.stringify(out, null, 2));
console.log("written", out.length);
