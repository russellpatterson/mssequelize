var config = module.exports

config["node tests"] = {
  environment: "node",
  rootPath: "../",
  tests: [
    "spec/**/dao.spec.js"
  ]
}
