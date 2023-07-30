## AI COMMIT

This simple utility make a commit description compliant witn [conventional commit] standard


### Features

* If update concerns **one staging file** or such file is provided by command line using `-c` argument, **it is put automatically as scope of commit** 
* Period is translated as new line in result message
* use postfix `as <the_topic_name>` to define commit topic
* use postfix `scope <the_scope_name>` to define commit scope. 


### Examples

| text | result | staging file (-c argument)
 --- | --- | ---
| `add password hashing as auth` | `feat(auth): add password hashing` |
| `update README.md`| `docs: update readme.md` | 
| `update`| `docs(README.md): update` |README.md|