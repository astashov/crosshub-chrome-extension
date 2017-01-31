# Crosshub Chrome Extension

This extension adds "Go to definition" and "Find usages" functionality to TypeScript projects on Github,
to the tree views and pull requests.
You can take it there:

[https://chrome.google.com/webstore/detail/crosshub-chrome-extensio/jmdjoliiaibifkklhipgmnciiealomhd](https://chrome.google.com/webstore/detail/crosshub-chrome-extensio/jmdjoliiaibifkklhipgmnciiealomhd)

## Why?

Why to make it, if there's [SourceGraph](https://sourcegraph.com/), which is more advanced in some aspects (like, it has docs on mouse hover, etc), actively developed, etc?
SourceGraph is indeed cool, but I missed some things there, like:

* It usually tries to get your to their site. I always want to stay on Github.
* The biggest use for me is code navigation during code reviews. So, the support in Pull Requests should be first-class, and preferably, when I go to definitions and usages, I want to stay there, at the same Pull Request page, just scrolling to various parts of it, if possible. I didn't find that in SourceGraph.
* And the main reason - SourceGraphs has to clone your repo on their servers to analyze it, and I'm really paranoid about it (and I bet my company wouldn't be happy to know I shared the source code with somebody except Github :)).

So, this is the solution, which allows you to control how you going to analyze the project (on your build servers, CI, or something like that), it's fully open source, your code doesn't go anywhere. Give it a try, it just changes the way you do the code reviews, and in a good way!

## Demo

[Here](https://raw.github.com/astashov/vim-ruby-debugger/master/demo.mp4) (16MB)

## Installation

To make this extension work, you need to generate crosshub.json files for each git sha,
and then put them somewhere publicly accessible (on your S3, for example). Github tree views
will download just one crosshub.json for the current sha, and the pull request views will download
2 of them (for the base and new shas).

So, to make it work:

Install 'crossts' npm package:

```bash
$ npm install -g crossts
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

To deliver your metadata files to S3, you can use the official `aws` tool. Then, you can run:

```bash
$ aws s3 cp crosshub.json s3://my_bucket/project_name/47811d652c29053934ce448668e39728edf3a412/crosshub.json --acl public-read
```

The structure of the URL on S3 is important. It should always end with the git sha and `crosshub.json`.
Like above, the URL ends with `47811d652c29053934ce448668e39728edf3a412/crosshub.json`.

#### Integrating with Travis CI

Doing all the uploads to S3 manually is very cumbersome, so better to use some machinery, like CI or build server, to do that stuff for you - for example, Travis CI. Here's how the configuration could look like:

`.travis.yml` file:

```yaml
language: node_js
install:
  # Here are other stuff to install
  - pip install --user awscli
  - npm install -g crossts
# ...
# Other sections if needed
# ...
after_success:
  - scripts/crosshub.sh
```

`scripts/crosshub.sh` file:

```bash
#!/usr/bin/env bash

set -e

if [ "$TRAVIS_PULL_REQUEST" != "false" ]
then
  CROSSHUB_HASH="${TRAVIS_COMMIT_RANGE#*...}"
else
  CROSSHUB_HASH="${TRAVIS_COMMIT}"
fi

echo "Building JSON file"
find src test \( -name "*.ts" -o -name "*.tsx" \) -type f -exec crossts {} + | gzip -c > crosshub.json

export AWS_ACCESS_KEY_ID=aws_access_key_id
export AWS_SECRET_ACCESS_KEY=aws_secret_access_key
export AWS_DEFAULT_REGION=us-east-1

echo "Uploading to S3"
aws s3 cp crosshub.json s3://your_bucket/your_app/$CROSSHUB_HASH/crosshub.json --acl public-read --content-encoding 'gzip'
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
