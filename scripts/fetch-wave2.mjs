import { writeFile, mkdir } from "node:fs/promises";

const urls = [
  "https://www.imperial.ac.uk/study/courses/postgraduate-taught/computing-artificial-intelligence-msc/",
  "https://www.gla.ac.uk/postgraduate/taught/data-science-artificial-intelligence/",
  "https://www.southampton.ac.uk/courses/artificial-intelligence-masters-msc",
  "https://www.qmul.ac.uk/postgraduate/taught/coursefinder/courses/artificial-intelligence-msc/",
  "https://www.york.ac.uk/study/postgraduate-taught/courses/msc-cyber-security/",
  "https://www.lancaster.ac.uk/study/postgraduate/postgraduate-courses/artificial-intelligence-msc/2026/",
  "https://www.port.ac.uk/study/courses/postgraduate-taught/msc-computer-science",
  "https://www.shu.ac.uk/courses/computing/msc-cyber-security/full-time/2027",
  "https://www.dmu.ac.uk/london/study/courses/cyber-security-artificial-intelligence.aspx",
  "https://www.tudublin.ie/study/postgraduate/courses/computing-data-science/",
  "https://www.tcd.ie/courses/postgraduate/courses/computer-science---intelligent-systems--mscpgraddip/",
  "https://www.tcd.ie/courses/postgraduate/fees/",
  "https://www.dcu.ie/courses/postgraduate/school-computing/msc-computing",
  "https://www.ucc.ie/en/ckr49/",
  "https://www.ul.ie/study/postgraduate/software-engineering-msc",
  "https://www.bath.ac.uk/courses/postgraduate-2026/taught-postgraduate-courses/msc-computer-science/",
  "https://warwick.ac.uk/study/postgraduate/courses/msc-computer-science/",
  "https://www.manchester.ac.uk/study/masters/courses/list/20434/msc-artificial-intelligence/",
  "https://www.birmingham.ac.uk/study/courses/postgraduate-taught/computer-science/artificial-intelligence-and-machine-learning-msc",
  "https://www.bristol.ac.uk/study/postgraduate/taught/msc-computer-science-conversion/",
  "https://courses.leeds.ac.uk/f128/advanced-computer-science-msc",
  "https://www.nottingham.ac.uk/pgstudy/course/taught/computer-science-msc",
  "https://www.ncl.ac.uk/postgraduate/degrees/5358f/",
  "https://www.ed.ac.uk/studying/postgraduate/degrees/index.php?r=site/view&id=918",
  "https://study.ed.ac.uk/programmes/postgraduate-taught/918-data-science",
  "https://omscs.gatech.edu/program-info/tuition-and-fees",
  "https://www.cc.gatech.edu/academics/degree-programs/masters/computer-science",
  "https://www.cs.cmu.edu/academics/masters",
  "https://catalog.purdue.edu/preview_program.php?catoid=15&poid=22500",
  "https://www.cs.umd.edu/grad/catalog",
  "https://www.stonybrook.edu/commcms/grad/academics/cs.php",
  "https://cse.ucsd.edu/graduate/degree-programs",
  "https://www.cs.washington.edu/academics/graduate",
  "https://www.cs.jhu.edu/academic-programs/graduate-studies/",
  "https://www.cs.wisc.edu/graduate/ms-program/",
  "https://asunow.asu.edu/20230816-computer-science-ms",
  "https://degrees.apps.asu.edu/masters-phd/major/ASU00/ESCOMSMS/computer-science-ms",
  "https://www.khoury.northeastern.edu/programs/master-of-science-in-computer-science-boston/",
  "https://www.cs.columbia.edu/education/ms/",
  "https://viterbigradadmission.usc.edu/programs/masters/msprograms/computer-science/",
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
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function windows(text, phrases) {
  const lower = text.toLowerCase();
  const found = [];
  for (const phrase of phrases) {
    let from = 0;
    let count = 0;
    while (count < 2) {
      const at = lower.indexOf(phrase.toLowerCase(), from);
      if (at < 0) break;
      found.push(text.slice(Math.max(0, at - 80), at + 220));
      from = at + phrase.length;
      count += 1;
    }
  }
  return found;
}

async function one(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html",
      },
    });
    const text = decode(await response.text());
    return {
      url,
      status: response.status,
      finalUrl: response.url,
      title: text.slice(0, 0),
      snippets: windows(text, [
        "overseas",
        "international",
        "non-eu",
        "non eu",
        "ielts",
        "toefl",
        "tuition",
        "2:1",
        "2:2",
        "first-class",
        "first class",
        "september",
        "january",
        "full-time",
        "gpa",
      ]).slice(0, 14),
    };
  } catch (error) {
    return { url, status: 0, error: error instanceof Error ? error.message : "fail", snippets: [] };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
for (let i = 0; i < urls.length; i += 5) {
  const batch = await Promise.all(urls.slice(i, i + 5).map(one));
  for (const item of batch) {
    results.push(item);
    console.log(item.status, item.finalUrl || item.url);
  }
}
await mkdir("data/raw", { recursive: true });
await writeFile("data/raw/wave2.json", JSON.stringify(results, null, 2));
console.log("saved", results.length);
