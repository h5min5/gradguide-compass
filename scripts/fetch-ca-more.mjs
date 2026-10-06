const urls = [
  "https://mscac.utoronto.ca/",
  "https://www.sfu.ca/computing/prospective-students/graduate-students.html",
  "https://www.uvic.ca/ecs/computerscience/graduate/future/index.php",
  "https://www.ualberta.ca/en/computing-science/graduate-studies/index.html",
  "https://www.cs.mcgill.ca/graduate/",
  "https://www.ontariotechs.ca/",
  "https://ontariotechu.ca/programs/graduate/computer-science/index.php",
  "https://www.wlu.ca/academics/faculties/faculty-of-science/computer-science/graduate-programs/index.html",
  "https://www.tru.ca/science/masters-degrees/mscds.html",
  "https://www.ucalgary.ca/future-students/graduate/explore-programs/computer-science-master-science-thesis-based",
  "https://www.uoguelph.ca/computing/graduate",
  "https://www.uregina.ca/science/computer-science/graduate.html",
];

function decode(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#36;/g, "$")
    .replace(/\s+/g, " ")
    .trim();
}

for (const url of urls) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
    });
    const text = decode(await response.text());
    console.log(response.status, text.length, response.url);
    console.log(text.slice(0, 180));
  } catch (error) {
    console.log(0, url, error instanceof Error ? error.message : "fail");
  } finally {
    clearTimeout(timer);
  }
}
