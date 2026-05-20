export interface ProductGroup {
  name: string;
  code: string;
}

export interface SubCategory {
  name: string;
  code: string;
  productGroups: ProductGroup[];
}

export interface Category {
  name: string;
  code: string;
  subCategories: SubCategory[];
}

export const CATEGORY_STRUCTURE: Category[] = [
  {
    name: "Gents Textile",
    code: "GT",
    subCategories: [
      {
        name: "T-Shirts",
        code: "TS",
        productGroups: [
          { name: "T-Shirt", code: "TS" },
          { name: "Tank Top / Vest", code: "TT" }
        ]
      },
      {
        name: "Polo",
        code: "PO",
        productGroups: [
          { name: "Polo Shirt", code: "PS" }
        ]
      },
      {
        name: "Shirts",
        code: "SH",
        productGroups: [
          { name: "Casual Shirt", code: "CS" },
          { name: "Formal Shirt", code: "FS" }
        ]
      },
      {
        name: "Trouser",
        code: "TR",
        productGroups: [
          { name: "Chino Trouser", code: "CT" },
          { name: "Formal Trouser", code: "FT" },
          { name: "Track / Jogger", code: "TJ" }
        ]
      },
      {
        name: "3 Quater",
        code: "TQ",
        productGroups: [
          { name: "3 Quater", code: "QU" },
          { name: "Cargo Pant", code: "CP" }
        ]
      },
      {
        name: "Pant",
        code: "PT",
        productGroups: [
          { name: "Denim Jeans", code: "DJ" },
          { name: "Gabardine pant", code: "GP" }
        ]
      },
      {
        name: "Half Pant / Shorts",
        code: "HP",
        productGroups: [
          { name: "Half Pant / Shorts", code: "HP" }
        ]
      },
      {
        name: "Lungi",
        code: "LU",
        productGroups: [
          { name: "Lungi", code: "LU" }
        ]
      },
      {
        name: "Punjabi",
        code: "PU",
        productGroups: [
          { name: "Punjabi", code: "PU" },
          { name: "Punjabi-Pajama Set", code: "PP" }
        ]
      },
      {
        name: "Pajama",
        code: "PJ",
        productGroups: [
          { name: "Pajama", code: "PA" }
        ]
      },
      {
        name: "Sportswear",
        code: "SP",
        productGroups: [
          { name: "Jersey Set", code: "JS" },
          { name: "Sports Shorts", code: "SS" }
        ]
      },
      {
        name: "Kids – Boys",
        code: "KB",
        productGroups: [
          { name: "Boys Pant", code: "BP" },
          { name: "Boys Punjabi", code: "BO" },
          { name: "Boys Shirt", code: "BS" },
          { name: "Boys T-Shirt", code: "BT" },
          { name: "School Uniform", code: "SU" }
        ]
      },
      {
        name: "Accessories – Gents",
        code: "AG",
        productGroups: [
          { name: "Cap", code: "CA" },
          { name: "Socks", code: "SO" },
          { name: "Undergarment", code: "UN" }
        ]
      }
    ]
  },
  {
    name: "Ladies Textile",
    code: "LT",
    subCategories: [
      {
        name: "3-Piece Sets",
        code: "PS",
        productGroups: [
          { name: "2-Piece Set", code: "PI" },
          { name: "3-Piece Embroidered", code: "PE" },
          { name: "3-Piece Printed", code: "PP" },
          { name: "3-Piece Stitched", code: "PS" },
          { name: "3-Piece Unstitched", code: "PU" },
          { name: "Block-print", code: "BP" }
        ]
      },
      {
        name: "Saree",
        code: "SR",
        productGroups: [
          { name: "Cotton Saree", code: "CS" },
          { name: "Georgette Saree", code: "GS" },
          { name: "Half-silk Saree", code: "HS" },
          { name: "Jamdani Saree", code: "JS" },
          { name: "Party Saree", code: "PA" },
          { name: "Printed Saree", code: "PS" },
          { name: "Silk Saree", code: "SS" }
        ]
      },
      {
        name: "Fabric – Than",
        code: "FT",
        productGroups: [
          { name: "Cotton Than", code: "CT" },
          { name: "Lawn Fabric", code: "LF" },
          { name: "Poplin Than", code: "PT" },
          { name: "Printed Cotton", code: "PC" },
          { name: "Silk Than", code: "ST" },
          { name: "Voile", code: "VO" }
        ]
      },
      {
        name: "Readymade Tops",
        code: "RT",
        productGroups: [
          { name: "Kurti", code: "KU" }
        ]
      },
      {
        name: "Hijab / Abaya",
        code: "HJ",
        productGroups: [
          { name: "Hijab / Abaya", code: "HA" }
        ]
      },
      {
        name: "Kids – Girls",
        code: "KG",
        productGroups: [
          { name: "Baby Girl Romper", code: "BG" },
          { name: "Girls 3-Piece", code: "GP" },
          { name: "Girls Frock", code: "GF" },
          { name: "Girls Party Dress", code: "GI" },
          { name: "School Uniform", code: "SU" }
        ]
      }
    ]
  },
  {
    name: "Footwear",
    code: "FW",
    subCategories: [
      {
        name: "Gents Footwear",
        code: "GF",
        productGroups: [
          { name: "Formal Shoe", code: "FS" },
          { name: "Loafer", code: "LO" },
          { name: "Sandal", code: "SA" },
          { name: "Sneaker / Canvas", code: "SC" }
        ]
      },
      {
        name: "Ladies Footwear",
        code: "LF",
        productGroups: [
          { name: "Flat Sandal", code: "FS" },
          { name: "Flat Shoe", code: "FL" },
          { name: "Heeled Sandal", code: "HS" },
          { name: "Slipper", code: "SL" },
          { name: "Sneaker", code: "SN" }
        ]
      },
      {
        name: "Kids Footwear",
        code: "KF",
        productGroups: [
          { name: "Baby Booties", code: "BB" },
          { name: "Girls Party Shoe", code: "GP" },
          { name: "Kids Sandal", code: "KS" },
          { name: "Kids Slipper", code: "KD" },
          { name: "Kids Sneaker", code: "KI" },
          { name: "School Shoe", code: "SS" }
        ]
      },
      {
        name: "Sports Footwear",
        code: "SF",
        productGroups: [
          { name: "Cricket Shoe", code: "CS" },
          { name: "Football Boot", code: "FB" },
          { name: "Rain & Safety", code: "RA" },
          { name: "Running Shoe", code: "RS" }
        ]
      }
    ]
  },
  {
    name: "Cosmetics & Beauty",
    code: "CB",
    subCategories: [
      {
        name: "Makeup",
        code: "MK",
        productGroups: [
          { name: "Eyes", code: "EY" },
          { name: "Face Powder", code: "FP" },
          { name: "Foundation", code: "FO" },
          { name: "Lip Color", code: "LC" }
        ]
      },
      {
        name: "Skincare",
        code: "SK",
        productGroups: [
          { name: "Face Pack & Mask", code: "FP" },
          { name: "Face Wash", code: "FW" },
          { name: "Moisturizer", code: "MO" },
          { name: "Serum & Toner", code: "ST" },
          { name: "Sunscreen", code: "SU" }
        ]
      },
      {
        name: "Hair Accessories",
        code: "HA",
        productGroups: [
          { name: "Hair Band", code: "HB" },
          { name: "Hair Clip", code: "HC" },
          { name: "Hair Net & Tools", code: "HN" },
          { name: "Scrunchie", code: "SC" }
        ]
      },
      {
        name: "Artificial Jewellery",
        code: "AJ",
        productGroups: [
          { name: "Bangle / Bracelet", code: "BB" },
          { name: "Bridal Set", code: "BS" },
          { name: "Earrings", code: "EA" },
          { name: "Necklace", code: "NE" },
          { name: "Nose & Head Ornament", code: "NH" },
          { name: "Ring", code: "RI" }
        ]
      },
      {
        name: "Imported & Trending",
        code: "IT",
        productGroups: [
          { name: "Fragrance & Body", code: "FB" },
          { name: "Makeup Tools", code: "MT" },
          { name: "Nail Polish", code: "NP" }
        ]
      }
    ]
  },
  {
    name: "Leather",
    code: "LR",
    subCategories: [
      {
        name: "Gents",
        code: "GN",
        productGroups: [
          { name: "Belt", code: "BE" },
          { name: "Wallet", code: "WA" }
        ]
      }
    ]
  },
  {
    name: "Sports & Games",
    code: "SG",
    subCategories: [
      {
        name: "Ball Sports",
        code: "BS",
        productGroups: [
          { name: "Basketball", code: "BA" },
          { name: "Cricket Ball", code: "CB" },
          { name: "Football", code: "FO" },
          { name: "Handball", code: "HA" },
          { name: "Volleyball", code: "VO" }
        ]
      },
      {
        name: "Cricket Equipment",
        code: "CE",
        productGroups: [
          { name: "Cricket Bat", code: "CB" },
          { name: "Kit Bag", code: "KB" },
          { name: "Protective Gear", code: "PG" },
          { name: "Wicket / Stumps", code: "WS" }
        ]
      },
      {
        name: "Racket Sports",
        code: "RS",
        productGroups: [
          { name: "Badminton Racket", code: "BR" },
          { name: "Badminton Set", code: "BS" },
          { name: "Shuttlecock", code: "SH" }
        ]
      },
      {
        name: "Sportswear & Accessories",
        code: "SA",
        productGroups: [
          { name: "Jersey Set", code: "JS" },
          { name: "Sports Tape & Equipment", code: "ST" },
          { name: "Water Bottle", code: "WB" }
        ]
      }
    ]
  },
  {
    name: "Bags & Luggage",
    code: "BL",
    subCategories: [
      {
        name: "Ladies Bags",
        code: "LB",
        productGroups: [
          { name: "Clutch", code: "CL" },
          { name: "Crossbody Bag", code: "CB" },
          { name: "Fashion Backpack", code: "FB" },
          { name: "Handbag", code: "HA" },
          { name: "Shoulder Bag", code: "SB" },
          { name: "Vanity / Makeup Bag", code: "VM" },
          { name: "Wallet", code: "WA" }
        ]
      },
      {
        name: "Gents Bags",
        code: "GB",
        productGroups: [
          { name: "Messenger Bag", code: "MB" },
          { name: "Travel Backpack", code: "TB" }
        ]
      },
      {
        name: "School & Kids Bags",
        code: "SC",
        productGroups: [
          { name: "Pencil Pouch", code: "PP" },
          { name: "School Backpack – Secondary", code: "SC" },
          { name: "School Bag – Primary", code: "SB" }
        ]
      },
      {
        name: "Travel & Eco",
        code: "TE",
        productGroups: [
          { name: "Jute Bag", code: "JB" }
        ]
      }
    ]
  },
  {
    name: "Electronics",
    code: "EL",
    subCategories: [
      {
        name: "Phone Accessories",
        code: "PA",
        productGroups: [
          { name: "Charger Adapter", code: "CA" },
          { name: "Charging Cable", code: "CC" },
          { name: "Earbuds", code: "EA" },
          { name: "Phone Accessories – Other", code: "PA" },
          { name: "Phone Case", code: "PC" },
          { name: "Power Bank", code: "PB" },
          { name: "Screen Protector", code: "SP" }
        ]
      },
      {
        name: "Small Gadgets",
        code: "GD",
        productGroups: [
          { name: "Bluetooth Speaker", code: "BS" },
          { name: "Earphone", code: "EA" },
          { name: "PC Accessories", code: "PA" },
          { name: "Smart Watch", code: "SW" },
          { name: "Torch / Flashlight", code: "TF" },
          { name: "USB Fan", code: "UF" }
        ]
      }
    ]
  },
  {
    name: "Home & Lifestyle",
    code: "HL",
    subCategories: [
      {
        name: "Bedding & Linen",
        code: "BD",
        productGroups: [
          { name: "Bed Sheet Set", code: "BS" },
          { name: "Mosquito Net", code: "MN" },
          { name: "Pillow Cover", code: "PC" },
          { name: "Prayer Mat", code: "PM" },
          { name: "Towel", code: "TO" }
        ]
      },
      {
        name: "Stationery & Office",
        code: "SO",
        productGroups: [
          { name: "File & Folder", code: "FF" },
          { name: "Geometry & Drawing", code: "GD" },
          { name: "Marker & Highlighter", code: "MH" },
          { name: "Notebook / Khata", code: "NK" },
          { name: "Pen / Pencil", code: "PP" }
        ]
      }
    ]
  }
];

export const getCategoryByCode = (code: string) => CATEGORY_STRUCTURE.find(c => c.code === code);
export const getCategoryByName = (name: string) => CATEGORY_STRUCTURE.find(c => c.name === name);

export const getSubCategoryByCode = (categoryCode: string, subCategoryCode: string) => {
  const category = getCategoryByCode(categoryCode);
  return category?.subCategories.find(s => s.code === subCategoryCode);
};

export const getSubCategoryByName = (categoryName: string, subCategoryName: string) => {
  const category = getCategoryByName(categoryName);
  return category?.subCategories.find(s => s.name === subCategoryName);
};

export const getProductGroupByCode = (categoryCode: string, subCategoryCode: string, groupCode: string) => {
  const subCategory = getSubCategoryByCode(categoryCode, subCategoryCode);
  return subCategory?.productGroups.find(g => g.code === groupCode);
};

export const getProductGroupByName = (categoryName: string, subCategoryName: string, groupName: string) => {
  const subCategory = getSubCategoryByName(categoryName, subCategoryName);
  return subCategory?.productGroups.find(g => g.name === groupName);
};
