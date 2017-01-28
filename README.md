# Crosshub Chrome Extension

This extension adds "Go to definition" and "Find usages" functionality to TypeScript projects on Github,
to the tree views and pull requests.
You can take it there:

[https://chrome.google.com/webstore/detail/crosshub-chrome-extensio/jmdjoliiaibifkklhipgmnciiealomhd](https://chrome.google.com/webstore/detail/crosshub-chrome-extensio/jmdjoliiaibifkklhipgmnciiealomhd)

## Demo

[Here](https://www.crosshub.info/demo.html) (1.7MB)

## Installation

### More complicated, but private and secure way (for super private projects)

To make this extension work, you need to generate crosshub.json files for each git sha,
and then put them somewhere publicly accessible (on your S3, for example). Github tree views
will download just one crosshub.json for the current sha, and the pull request views will download
2 of them (for the base and new shas).

So, to make it work:

Install 'crossts' npm package:

```bash
$ npm install crossts
```

and then run as

```bash
$ crossts path/to/file.ts path/to/another_file.ts ... > crosshub.json
```

You can feed e.g. all the files from `src` and `test` directories like this:

```bash
$ find src test \( -name "*.ts" -o -name "*.tsx" \) -type f -exec crossts {} + > crosshub.json
```

It will generate the crosshub.json file in the current directory, which you will need to put somewhere,
for example, to S3 (see below).

#### Uploading metadata

You need some publicly available place to store metadatas for every single commit for your project. You can use S3 for that. It's cheap and relatively easy to configure.

You probably may want to create a separate bucket on S3 for crosshub metadata files, and then set correct CORS configuration for it. For that, click to the bucket in AWS S3 console, and in the "Properties" tab find "Add CORS Configuration". You can add something like this there:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
  </CORSRule>
</CORSConfiguration>
```

To deliver your metadata files to S3, you can use official `aws` tool. Then, you can run:

```bash
$ aws s3 cp - s3://my_bucket/project_name/47811d652c29053934ce448668e39728edf3a412/crosshub.json --acl public-read
```

The structure of the URL on S3 is important. It should always end with the git sha and `crosshub.json`.
Like above, the URL ends with `47811d652c29053934ce448668e39728edf3a412/crosshub.json`.

#### Integrating with Travis CI

Doing all the uploads to S3 manually is very cumbersome, so better to use some machinery, like CI or build server, to do that stuff for you, for example Travis CI. Here's how the configuration could look like:

`.travis.yml` file:

```yaml
language: node_js
install:
  # Here are other stuff to install
  - travis_retry sudo apt-get install --yes aws
# ...
# Other sections if needed
# ...
after_success:
  - tool/crosshub_runner
```

`tool/crosshub_runner` file:

```bash
#!/bin/bash
#
# This script is invoked by Travis CI to generate Crosshub metadata for the Crosshub Chrome extension
if [ "$TRAVIS_PULL_REQUEST" != "false" ]
then
  CROSSDART_HASH="${TRAVIS_COMMIT_RANGE#*...}"
else
  CROSSDART_HASH="${TRAVIS_COMMIT}"
fi
echo "Installing crosshub"
pub global activate crosshub
echo "Generating metadata for crosshub"
pub global run crosshub --input=. --dart-sdk=$DART_SDK
echo "Copying the crosshub json file to S3 ($CROSSDART_HASH)"
s3cmd -P -c ./.s3cfg put ./crosshub.json s3://my-bucket/crosshub/my-github-name/my-project/$CROSSDART_HASH/crosshub.json
```

Now, every time somebody pushes to 'master', after Travis run, I'll have hyperlinked code of my project on Github.
And every time somebody creates a pull request for me on Github, it's code also going to be hyperlinked.

How cool is that! :)

## Setting up the Crosshub Chrome extension:

After installing [Crosshub Chrome Extension](https://chrome.google.com/webstore/detail/crosshub-chrome-extensio/jmdjoliiaibifkklhipgmnciiealomhd), you'll see a little "XD" icon in Chrome's URL bar on Github pages.
If you click to it, you'll see a little popup, where you can turn Crosshub on for the current project, and also
specify the URL where it should get the analysis data from.
You only should provide a base for this URL, the extension will later append git sha and 'crosshub.json' to it. I.e. if you specify URL in this field like:

```
https://my-bucket.s3.amazonaws.com/crosshub
```

then the extension will try to find crosshub.json files by URLs, which will look like:

```
https://my-bucket.s3.amazonaws.com/crosshub/4a9f8b41d042183116bbfaba31bdea109cc3080d/crosshub.json
```

If your project is private, you also will need to create access token, and paste it into the field in the popup as well.
You can do that there: https://github.com/settings/tokens/new.

## Contributing

Please use Github's bug tracker for bugs. Pull Requests are welcome.
