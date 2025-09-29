async function search() {
  const query = document.getElementById("query").value;
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "Searching...";

  try {
    const response = await fetch("https://take-the-challenge-fwwt.vercel.app/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      resultsDiv.innerHTML = "<p>No results found.</p>";
      return;
    }

    resultsDiv.innerHTML = "";
    data.results.forEach(r => {
      const div = document.createElement("div");
      div.className = "result";

      // Ako postoji jira_url, naslov je link
      const titleHtml = r.jira_url
        ? `<a href="${r.jira_url}" target="_blank" style="text-decoration:none; color:#0073e6;">
             ${r.title}
           </a>`
        : r.title;

      div.innerHTML = `
        <strong>${titleHtml}</strong><br>
        ${r.content}<br>
        <span class="similarity">Similarity: ${r.similarity.toFixed(3)}</span><br>
        <span class="meta">
          Reporter: ${r.reporter || "N/A"} |
          Severity: ${r.severity || "N/A"} |
          Date: ${r.date_reported ? new Date(r.date_reported).toLocaleDateString() : "N/A"}
        </span>
      `;
      resultsDiv.appendChild(div);
    });
  } catch (err) {
    resultsDiv.innerHTML = "<p style='color:red;'>Error: " + err.message + "</p>";
  }
}
