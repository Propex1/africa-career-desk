import assert from "node:assert/strict";
import { cardLocation } from "./card-location.ts";
const cases = [
  [{city:"Windhoek",country:"Namibia",locationDisplay:"Windhoek, Khomas Region, Namibia"}, "Windhoek, Namibia"],
  [{city:"Kinshasa",country:"Democratic Republic of the Congo",locationDisplay:"Kinshasa, Democratic Republic of the Congo"}, "Kinshasa, DR Congo"],
  [{city:"Abidjan",country:"CIV",locationDisplay:"Abidjan, CIV"}, "Abidjan, Côte d’Ivoire"],
  [{city:"Casablanca",country:"Morocco",locationDisplay:"Casablanca"}, "Casablanca, Morocco"],
  [{city:"Lagos",country:"Nigeria",locationDisplay:"Ikoyi, Lagos, Nigeria"}, "Lagos, Nigeria"],
  [{city:"Cape Town",country:"South Africa",locationDisplay:"Cape Town / Johannesburg, South Africa (Remote)"}, "Cape Town / Johannesburg, South Africa (Remote)"],
  [{country:"Kenya",locationDisplay:"Multiple countries"}, "Multiple countries"],
  [{locationDisplay:"Remote — Africa (EAT ±3h)"}, "Remote — Africa (EAT ±3h)"],
  [{city:"Gauteng",country:"South Africa",locationDisplay:"Gauteng, South Africa"}, "Gauteng, South Africa"],
  [{locationDisplay:"Location unknown"}, "Location unknown"],
  [{locationDisplay:"",workArrangement:"remote"}, "Remote — Location not specified"],
  [{locationDisplay:"Kinshasa, COD"}, "Kinshasa, DR Congo"],
  [{locationDisplay:"Johannesburg, ZAF"}, "Johannesburg, South Africa"],
] as const;
for (const [input, expected] of cases) {
  const before = JSON.stringify(input);
  assert.equal(cardLocation(input), expected);
  assert.equal(JSON.stringify(input), before);
}
console.log(`${cases.length} card location cases passed; original data unchanged.`);
