const searchInput = document.querySelector("[data-search-input]");
const cards = Array.from(document.querySelectorAll("[data-paper-card]"));
const emptyMessage = document.querySelector("[data-empty-message]");

if (searchInput) {
  const applyFilter = () => {
    const query = searchInput.value.trim().toLowerCase();
    let visible = 0;
    for (const card of cards) {
      const haystack = card.dataset.search || "";
      const matches = !query || haystack.includes(query);
      card.hidden = !matches;
      if (matches) {
        visible += 1;
      }
    }
    if (emptyMessage) {
      emptyMessage.hidden = visible !== 0;
    }
  };

  searchInput.addEventListener("input", applyFilter);
  applyFilter();
}
