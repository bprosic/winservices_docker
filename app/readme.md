When socket suddenly throws error EACCES in windows,
run powershell with admin and run:
    net stop winnat
    net start winnat


DONT FORMAT handlebars with prettier.
If using { { function } }  -- then it will throw you errors.

If 1 error in JS, then whole app doesnt work, so look into console if there are errors!!!

Thats why .prettierignore, .prettierrc and .vscode/settings.json exists, to disable prettier.