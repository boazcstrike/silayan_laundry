const starting_x_left = 150;
const starting_x_right = 800;
const starting_y_right = 305;
const group_space = 92
const box_space = 43.5
const double_space = 40

const categories = {
    "Regular Laundry": [
        { name: "Barongs", x: starting_x_left, y: 540, group: "uppers" },
        { name: "Blouses", x: starting_x_left, y: 588, group: "uppers" },
        { name: "Caps / Bonnets / Headgear", x: starting_x_left, y: 652.5, group: "uppers" },
        { name: "Coats / Jackets", x: starting_x_left, y: 696, group: "uppers" },
        { name: "Polo shirts", x: starting_x_left, y: 739.5 },
        { name: "Polos", x: starting_x_left, y: 783 },
        { name: "Sandos", x: starting_x_left, y: 826.5 },
        { name: "T-shirts", x: starting_x_left, y: 870 },
        { name: "Pants", x: starting_x_left, y: 962 },
        { name: "Shorts", x: starting_x_left, y: 1005.5 },
        { name: "Skirts", x: starting_x_left, y: 1049 },
        { name: "Dresses", x: starting_x_left, y: 1049 + group_space },
        { name: "Dusters", x: starting_x_left, y: 1049 + box_space + group_space },
        { name: "Gowns", x: starting_x_left, y: 1049 + (box_space * 2) + group_space },
        { name: "Jumpers", x: starting_x_left, y: 1049 + (box_space * 3) + group_space },
        { name: "Overalls", x: starting_x_left, y: 1049 + (box_space * 4) + group_space },
        { name: "Bras", x: starting_x_left, y: 1049 + (box_space * 4) + (group_space * 2) },
        { name: "Briefs / Boxers", x: starting_x_left, y: 1049 + (box_space * 5) + (group_space * 2) },
        { name: "Chemise / Half-slips", x: starting_x_left, y: 1049 + (box_space * 6) + (group_space * 2) },
        { name: "Panties", x: starting_x_left, y: 1049 + (box_space * 7 + double_space) + (group_space * 2) },
        { name: "Panty Hose", x: starting_x_left, y: 1049 + (box_space * 8 + double_space) + (group_space * 2) },
        { name: "Socks (per pc. not pair)", x: starting_x_left, y: 1049 + (box_space * 9 + (double_space * 2)) + (group_space * 2) },
        { name: "Stockings", x: starting_x_left, y: 1049 + (box_space * 10 + (double_space * 2)) + (group_space * 2) },
    ],
    "Home Items": [
        { name: "Bath Robes", x: starting_x_right, y: starting_y_right },
        { name: "Bathmats", x: starting_x_right, y: starting_y_right + box_space * 1 },
        { name: "Bed Sheets", x: starting_x_right, y: starting_y_right + box_space * 2 },
        { name: "Blankets", x: starting_x_right, y: starting_y_right + box_space * 3 },
        { name: "Comforters", x: starting_x_right, y: starting_y_right + box_space * 4 },
        { name: "Curtains", x: starting_x_right, y: starting_y_right + box_space * 5 },
        { name: "Place mats", x: starting_x_right, y: starting_y_right + box_space * 6 },
        { name: "Pillowcases", x: starting_x_right, y: starting_y_right + box_space * 7 },
        { name: "Table runners", x: starting_x_right, y: starting_y_right + box_space * 8 },
        { name: "Tablecloths", x: starting_x_right, y: starting_y_right + box_space * 9 },
        { name: "Towels / Face Towels", x: starting_x_right, y: starting_y_right + box_space * 10 },
    ],

    /* there's supposed to be baby clothing but i do not have a baby, so...
    uppers, lowers, overalls
    */
    "Other Items": [
        { name: "Bags", x: starting_x_right, y: starting_y_right + box_space * 11 + group_space },
        { name: "Shoes", x: starting_x_right, y: starting_y_right + box_space * 12 + group_space },
    ],
};

export default categories;