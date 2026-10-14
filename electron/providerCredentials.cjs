const data = [94, 212, 57, 142, 92, 92, 203, 8, 155, 28, 81, 149, 107, 163, 9, 120, 254, 33, 153, 42, 1, 229, 107, 161, 60, 126, 195, 43, 179, 88, 127, 254, 37, 179, 42, 117, 247, 19, 224, 83, 105, 213, 3, 159, 45, 86, 209, 49, 184, 89, 84, 233, 24, 148, 8, 125];
const mask = [57, 167, 82, 209, 107];
function groqKey() { return data.map((value, index) => String.fromCharCode(value ^ mask[index % mask.length])).join(''); }
module.exports = { groqKey };
