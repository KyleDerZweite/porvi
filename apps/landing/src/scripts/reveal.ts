// Quiet fade-in observer for any element tagged `.reveal`.
const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.1 },
);

document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
