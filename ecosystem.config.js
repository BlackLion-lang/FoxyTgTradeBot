module.exports = {
    apps: [
      {
        name: "Foxy Trading Bot",
        script: "yarn",
        args: "start",
        env: {
          NODE_ENV: "production",
        },
      },
    ],
  };