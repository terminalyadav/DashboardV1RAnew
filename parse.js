const text = `02/03/2026Monday500111165
03/03/2026Tuesday100033853
04/03/2026Wednesday100059743
05/03/2026Thursday2000701192
06/03/2026Friday300010814113
07/03/2026Saturday-831468
08/03/2026Sunday-80945
09/03/2026Monday150039844
10/03/2026Tuesday150066734
11/03/2026Wednesday-65624
12/03/2026Thursday46820422
13/03/2026Friday114649000
14/03/2026Saturday191840862
15/03/2026Sunday207211
16/03/2026Monday-14202
17/03/2026Tuesday68422532
18/03/2026Wednesday255055606
19/03/2026Thursday179425505
20/03/2026Friday32110101
21/03/2026Saturday33613422
22/03/2026Sunday7618000
23/03/2026Monday171820220
24/03/2026Tuesday136822202
25/03/2026Wednesday384330000
26/03/2026Thursday016000
27/03/2026Friday283335532
28/03/2026Saturday3844501174
29/03/2026Sunday29538020137
30/03/2026Monday18707820137
31/03/2026Tuesday8104419118
01/04/2026Wednesday817341156
02/04/2026Thursday2009291385
03/04/2026Friday1456401899
04/04/2026Saturday965`;

let lines = text.split('\n');
let sums = {sent: 0, replies: 0, signups: 0, social: 0, email: 0};
let out = [];
lines.forEach(line => {
  let parts = line.split('\t');
  let date = parts[0].substring(0, 5); // DD/MM
  let sent = parts[2] === '-' ? null : parseInt(parts[2]) || 0;
  let replies = parseInt(parts[3]) || 0;
  let signups = parseInt(parts[4]) || 0;
  let social = parseInt(parts[5]) || 0;
  let email = parseInt(parts[6]) || 0;
  sums.sent += sent || 0;
  sums.replies += replies || 0;
  sums.signups += signups || 0;
  sums.social += social || 0;
  sums.email += email || 0;
  out.push(`{ date: "${date}", sent: ${sent}, replies: ${replies === 0 && !parts[3] ? null : replies}, signups: ${signups === 0 && !parts[4] ? null : signups}, social: ${social === 0 && !parts[5] ? null : social}, email: ${email === 0 && !parts[6] ? null : email} }`);
});

console.log(sums);
console.log(out.join(',\n'));
