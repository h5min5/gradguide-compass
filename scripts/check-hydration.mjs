const response = await fetch("http://localhost:3000/");
const text = await response.text();
const scripts = [...text.matchAll(/src="([^"]+)"/g)].map((match) => match[1]);
console.log(scripts.filter((src) => src.includes("_next")).join("\n"));
console.log("status", response.status, "length", text.length);
