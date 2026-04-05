const text = `02/03/2026	Monday	500	11	11	6	5
03/03/2026	Tuesday	1000	33	8	5	3
04/03/2026	Wednesday	1000	59	7	4	3
05/03/2026	Thursday	2000	70	11	9	2
06/03/2026	Friday	3000	108	14	11	3
07/03/2026	Saturday	-	83	14	6	8
08/03/2026	Sunday	-	80	9	4	5
09/03/2026	Monday	1500	39	8	4	4
10/03/2026	Tuesday	1500	66	7	3	4
11/03/2026	Wednesday	-	65	6	2	4
12/03/2026	Thursday	468	20	4	2	2
13/03/2026	Friday	1146	49	0	0	0
14/03/2026	Saturday	1918	40	8	6	2
15/03/2026	Sunday	20	7	2	1	1
16/03/2026	Monday	-	14	2	0	2
17/03/2026	Tuesday	684	22	5	3	2
18/03/2026	Wednesday	2550	55	6	0	6
19/03/2026	Thursday	1794	25	5	0	5
20/03/2026	Friday	321	10	1	0	1
21/03/2026	Saturday	336	13	4	2	2
22/03/2026	Sunday	761	8	0	0	0
23/03/2026	Monday	1718	20	2	2	0
24/03/2026	Tuesday	1368	22	2	0	2
25/03/2026	Wednesday	3843	30	0	0	0
26/03/2026	Thursday	0	16	0	0	0
27/03/2026	Friday	2833	35	5	3	2
28/03/2026	Saturday	3844	50	11	7	4
29/03/2026	Sunday	2953	80	20	13	7
30/03/2026	Monday	1870	78	20	13	7
31/03/2026	Tuesday	810	44	19	11	8
01/04/2026	Wednesday	817	34	11	5	6
02/04/2026	Thursday	2009	29	13	8	5
03/04/2026	Friday	1456	40	18	9	9
04/04/2026	Saturday	965`;

let sums = { sent: 0, replies: 0, signups: 0, social: 0, email: 0 };
let jsonOutput = [];

const lines = text.split("\n");
for (let line of lines) {
    let parts = line.split("\t");
    let date = parts[0].substring(0, 5); // get DD/MM from "DD/MM/YYYY"
    
    let sentStr = parts[2].trim();
    let sent = (sentStr === '-' || sentStr === '') ? null : parseInt(sentStr, 10);
    if (!isNaN(sent) && sent !== null) sums.sent += sent;

    let replStr = parts[3] ? parts[3].trim() : '';
    let replies = (replStr === '-' || replStr === '') ? null : parseInt(replStr, 10);
    if (!isNaN(replies) && replies !== null) sums.replies += replies;

    let signStr = parts[4] ? parts[4].trim() : '';
    let signups = (signStr === '-' || signStr === '') ? null : parseInt(signStr, 10);
    if (!isNaN(signups) && signups !== null) sums.signups += signups;

    let socStr = parts[5] ? parts[5].trim() : '';
    let social = (socStr === '-' || socStr === '') ? null : parseInt(socStr, 10);
    if (!isNaN(social) && social !== null) sums.social += social;

    let emailStr = parts[6] ? parts[6].trim() : '';
    let email = (emailStr === '-' || emailStr === '') ? null : parseInt(emailStr, 10);
    if (!isNaN(email) && email !== null) sums.email += email;

    jsonOutput.push(`  { date: "${date}", sent: ${sent}, replies: ${replies}, signups: ${signups}, social: ${social}, email: ${email} }`);
}

console.log("SUMS:", sums);
console.log("ARRAY:");
console.log("const creatorOutreachHistory = [");
console.log(jsonOutput.join(",\n"));
console.log("];");
