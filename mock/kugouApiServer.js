"use strict";

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(
    cors({
        origin: true,
        credentials: true,
    })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const mockAccount = {
    userid: "90000001",
    token: "mock-kugou-token",
    vip_type: 0,
    vip_token: "",
    nickname: "Hydrogen Mock User",
    avatar: "https://img.kugoucdn.com/v2/kugouicon/7ab37b873c2bf4cda0f0ac0a0aa1a95d.png",
};

const success = (body = {}) => ({
    status: 1,
    error: "",
    msg: "success",
    data: body,
    cookie: [
        `token=${mockAccount.token}`,
        `userid=${mockAccount.userid}`,
        `vip_type=${mockAccount.vip_type}`,
        `vip_token=${mockAccount.vip_token}`,
    ],
});

const captchaStatus = {};

app.post("/captcha/sent", (req, res) => {
    const mobile = req.body?.mobile || req.query?.mobile;
    if (mobile) {
        captchaStatus[mobile] = "123456";
    }
    res.json(success({ mobile }));
});

app.post("/login", (req, res) => {
    const { username } = req.body || {};
    if (!username) {
        return res.json({ status: 0, msg: "missing username" });
    }
    res.json(success({ ...mockAccount, username }));
});

app.post("/login/cellphone", (req, res) => {
    const { mobile, code } = req.body || {};
    if (!mobile || !code) {
        return res.json({ status: 0, msg: "缺少手机号或验证码" });
    }
    if (captchaStatus[mobile] && captchaStatus[mobile] !== code) {
        return res.json({ status: 0, msg: "验证码错误" });
    }
    res.json(success({ ...mockAccount, mobile }));
});

app.post("/login/token", (req, res) => {
    res.json(success(mockAccount));
});

app.post("/logout", (_req, res) => {
    res.json(success());
});

app.post("/user/detail", (req, res) => {
    res.json(
        success({
            userid: mockAccount.userid,
            nickname: mockAccount.nickname,
            headurl: mockAccount.avatar,
            levelname: "普通用户",
        })
    );
});

app.all("*", (_req, res) => {
    res.status(404).json({ status: 404, msg: "mock endpoint not implemented" });
});

app.listen(PORT, () => {
    /* eslint-disable no-console */
    console.log("");
    console.log("Hydrogen mock KuGou API server");
    console.log(`➡ Listening at http://localhost:${PORT}`);
    console.log("Endpoints:");
    console.log("  POST /captcha/sent");
    console.log("  POST /login");
    console.log("  POST /login/cellphone");
    console.log("  POST /login/token");
    console.log("  POST /logout");
    console.log("  POST /user/detail");
    console.log("");
});

