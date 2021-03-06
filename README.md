# Create-Child-Links

> Currently only available on TFS 2017 or later and Visual Studio Team Services.

## Source code 

The [source](https://github.com/HPoliquin/Create-Child-Links) for this extension can be found on Github - feel free to take, fork and extend. 

You can also learn how to build your own custom control extension for the work item form [here](https://www.visualstudio.com/en-us/docs/integrate/extensions/develop/custom-control). 

## Feedback 

We need your feedback! Here are some ways to connect with us:

* Add a review below.
* Report issues in [GitHub](https://github.com/HPoliquin/Create-Child-Links/issues).

## To Use

Install vss-web-extension-dsk

``` Command
> npm install -g vss-web-extension-sdk --save
```

Install txf-cli

``` Command
­> npm install -g tfx-cli
```

Install TypeScript & Grunt:

``` Command
> npm install -g typescript grunt-cli
```

Install node modules:

``` Command
npm install
```

### To Compile

To test compilation, you can run `grunt`. You should receive no errors.

### To Create a Publish Manifest

``` command
grunt publish-dev
grunt mjq-dev
```

OR

``` command
grunt publish-release
grunt mjq-release
```
