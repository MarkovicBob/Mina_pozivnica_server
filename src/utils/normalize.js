// latinica+ćirilica -> latinica bez dijakritika i razmaka
export function toSearchKey(s = "") {
  const cirToLat = {
    а:"a",б:"b",в:"v",г:"g",д:"d",ђ:"dj",е:"e",ж:"z",з:"z",и:"i",
    ј:"j",к:"k",л:"l",љ:"lj",м:"m",н:"n",њ:"nj",о:"o",п:"p",р:"r",
    с:"s",т:"t",ћ:"c",у:"u",ф:"f",х:"h",ц:"c",ч:"c",џ:"dz",ш:"s"
  };

  return (s || "")
    .toLowerCase()
    .split("").map(ch => cirToLat[ch] ?? ch).join("")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g,"dj").replace(/š/g,"s").replace(/ž/g,"z")
    .replace(/č|ć/g,"c").replace(/\s+/g,"");
}
