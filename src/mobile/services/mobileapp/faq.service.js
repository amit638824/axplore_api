const faqData = require("../../data/faq.json");

let cache = {
  data: null,
  expiry: null,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 min 

exports.getFaqList = async (query) => {
  try {
    const now = Date.now();

    //  Return cached data (only if no filters)
    if (!query.search && !query.category) {
      if (cache.data && cache.expiry > now) {
        return cache.data;
      }
    }

    let { search, category } = query;
    let faqs = [...faqData];

    //  Search
    if (search) {
      const keyword = search.toLowerCase();
      faqs = faqs.filter(
        (item) =>
          item.title.toLowerCase().includes(keyword) ||
          item.description.toLowerCase().includes(keyword)
      );
    }

    if (category) {
      const cat = category.toLowerCase();
      faqs = faqs.filter(
        (item) => item.category.toLowerCase() === cat
      );
    }

    faqs = faqs.sort((a, b) => a.order - b.order);

    const result = faqs.map((item, index) => ({
      id: index + 1,
      category: item.category,
      title: item.title,
      description: item.description,
      order: item.order,
    }));

    if (!search && !category) {
      cache = {
        data: result,
        expiry: now + CACHE_TTL,
      };
    }

    return result;

  } catch (error) {
    console.error("Error fetching FAQ list", error);
    throw new Error("Unable to fetch FAQs");
  }
};