text = """02/03/2026 Monday 500 11 11 6 5
03/03/2026 Tuesday 1000 33 8 5 3
04/03/2026 Wednesday 1000 59 7 4 3
05/03/2026 Thursday 2000 70 11 9 2
06/03/2026 Friday 3000 108 14 11 3
07/03/2026 Saturday - 83 14 6 8
08/03/2026 Sunday - 80 9 4 5
09/03/2026 Monday 1500 39 8 4 4
10/03/2026 Tuesday 1500 66 7 3 4
11/03/2026 Wednesday - 65 6 2 4
12/03/2026 Thursday 468 20 4 2 2
13/03/2026 Friday 1146 49 0 0 0
14/03/2026 Saturday 1918 40 8 6 2
15/03/2026 Sunday 20 7 2 1 1
16/03/2026 Monday - 14 2 0 2
17/03/2026 Tuesday 684 22 5 3 2
18/03/2026 Wednesday 2550 55 6 0 6
19/03/2026 Thursday 1794 25 5 0 5
20/03/2026 Friday 321 10 1 0 1
21/03/2026 Saturday 336 13 4 2 2
22/03/2026 Sunday 761 8 0 0 0
23/03/2026 Monday 1718 20 2 2 0
24/03/2026 Tuesday 1368 22 2 0 2
25/03/2026 Wednesday 3843 30 0 0 0
26/03/2026 Thursday 0 16 0 0 0
27/03/2026 Friday 2833 35 5 3 2
28/03/2026 Saturday 3844 50 11 7 4
29/03/2026 Sunday 2953 80 20 13 7
30/03/2026 Monday 1870 78 20 13 7
31/03/2026 Tuesday 810 44 19 11 8
01/04/2026 Wednesday 817 34 11 5 6
02/04/2026 Thursday 2009 29 13 8 5
03/04/2026 Friday 1456 40 18 9 9
04/04/2026 Saturday 965"""

lines = text.split("\n")
total_sent = 0
total_replies = 0
total_signups = 0
total_social = 0
total_email = 0

data = []

for line in lines:
    parts = line.split()
    date = parts[0]
    date_val = f"{date[0:2]}/{date[3:5]}"
    sent_str = parts[2]
    # parse sent
    sent = None
    if sent_str != '-':
        try:
            sent = int(sent_str)
            total_sent += sent
        except: pass
    
    replies, signups, social, email = None, None, None, None
    if len(parts) > 3 and parts[3] != '-':
        replies = int(parts[3])
        total_replies += replies
    if len(parts) > 4 and parts[4] != '-':
        signups = int(parts[4])
        total_signups += signups
    if len(parts) > 5 and parts[5] != '-':
        social = int(parts[5])
        total_social += social
    if len(parts) > 6 and parts[6] != '-':
        email = int(parts[6])
        total_email += email
        
    s_str = 'null' if sent is None else sent
    r_str = 'null' if replies is None else replies
    su_str = 'null' if signups is None else signups
    so_str = 'null' if social is None else social
    e_str = 'null' if email is None else email

    data.append(f'{{ date: "{date_val}", sent: {s_str}, replies: {r_str}, signups: {su_str}, social: {so_str}, email: {e_str} }}')

print(f"Total Sent: {total_sent}")
print(f"Total Replies: {total_replies}")
print(f"Total Signups: {total_signups}")
print(f"Total Social: {total_social}")
print(f"Total Email: {total_email}")

print(",\n  ".join(data))
