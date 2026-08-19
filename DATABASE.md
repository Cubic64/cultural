# Database

Tables:
- users
- groups
- user_groups
- competitions
- announcements
- attendance
- messages

Relationships:
users 1--N attendance
groups 1--N attendance
users N--N groups through user_groups
groups 1--N messages
users 1--N messages
users 1--N groups as optional leader
