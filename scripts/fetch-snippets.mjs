const jobs = [
  ["https://www.uow.edu.au/study/courses/master-of-computer-science/", ["February", "Autumn Session", "session start"]],
  ["https://www.grad.ubc.ca/prospective-students/graduate-degree-programs/master-of-data-science", ["month", "September", "IELTS", "bachelor", "English"]],
  ["https://programsandcourses.anu.edu.au/program/MMLCV", ["Cognate Disciplines", "February", "IELTS"]],
  ["https://www.unsw.edu.au/study/postgraduate/master-of-information-technology", ["international student", "IELTS", "Term 1"]],
];

function decode(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&rsquo;|&#8217;|&#39;/g, "'")
    .replace(/&#36;/g, "$")
    .replace(/\s+/g, " ")
    .trim();
}

for (const [url, phrases] of jobs) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
  });
  const text = decode(await response.text());
  console.log("\n##", url);
  for (const phrase of phrases) {
    let from = 0;
    let count = 0;
    while (count < 2) {
      const at = text.toLowerCase().indexOf(phrase.toLowerCase(), from);
      if (at < 0) break;
      console.log(">", phrase, ":", text.slice(Math.max(0, at - 90), at + 240));
      from = at + phrase.length;
      count += 1;
    }
    if (count === 0) console.log(">", phrase, ": NOT FOUND");
  }
}
