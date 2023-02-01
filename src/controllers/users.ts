import { Request, Response } from "express";
import CryptoJS from "crypto-js";
import nodemailer from "nodemailer";
import hbs from "nodemailer-express-handlebars";
const path = require('path')


// importing typeORM prisma...........
import { PrismaClient } from "@prisma/client";
const { user } = new PrismaClient();

// environment variables........
import * as dotenv from "dotenv";
dotenv.config();

function validatePassword(password: any) {
    const re = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{7,}$/;
    return re.test(password);
}

// .......  user  sign up   ....................
const createPerson = async (req: Request, res: Response) => {
    try {
        type createPersonInput = {
            name: string;
            email: string;
            age: number;
            password: string;
        };
        const {
            name,
            email,
            age,
            password,
        }: createPersonInput = req.body;

        console.log(req.body);

        const userExists = await user.findFirst({
            where: {
                email,
            },
        });

        if (userExists) {
            res.status(400).send({ message: "user already exists" });
            return;
        } else {

            if (!name || !email || !age || !password) {
                res.status(400).send({ message: "user details not valid!" });
                return;
            }

            if (age < 1 || age > 99) {
                res.status(400).send({ message: "please provide the age in the period of 1-99!" });
                return;
            }

            if (!email.includes("@") || !email.includes(".")) {
                res.status(400).send({ message: "Invalid email!" });
                return;
            }

            if (!validatePassword(password)) {
                res.status(400).send({ message: "Invalid password!" });
                return;
            }

            // password encryption...........................
            let keysec = process.env.ENCRYPTION_KEY as string;
            var ciphertext = CryptoJS.AES.encrypt(password, keysec).toString();

            const newUser = await user.create({
                data: {
                    name,
                    email,
                    age,
                    password: ciphertext,
                }
            });

            console.log("NewUser registered", newUser);

            // initialize nodemailer
            let transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: "jayakrishnan@scriptlanes.com",
                    pass: "sivzgeycbgqpmsnz",
                },
            });

            // point to the template folder
            const handlebarOptions : any = {
                viewEngine: {
                    partialsDir: path.resolve('./src/views/'),
                    defaultLayout: false,
                },
                viewPath: path.resolve('./src/views/'),
            };

            // use a template file with nodemailer
            transporter.use('compile', hbs(handlebarOptions))

            var mailOptions = {
                from: 'jayakrishnan@scriptlanes.com', // sender address
                to: 'jayakrishnansfc43@gmail.com', // list of receivers
                subject: 'Welcome message🙏',
                template: 'index', // the name of the template file i.e email.handlebars
                context: {
                    email: `${email}`, 
                    password: `${password}` 
                }
            }; 

            // trigger the sending of the E-mail
            await transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    return console.log(error);
                }
                console.log('Message sent: ' + info.response);
            });

            const createdUser = {
                data: { name, email, age }
            };

            res.send({ message: "User created successfully", createdUser });
        }
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: error });
    }
};



// ....... get all users ................................................................
const allUsers = async (req: Request, res: Response) => {
    try {
        const users = await user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                age: true,
                password: false
            },
        });
        console.log(users);
        res.send({ users });

    } catch (error) {
        console.log(error);
        res.status(500).send({ message: error });
    }
};


// .......  user  login   ....................

const loginUser = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (email == undefined || password == undefined) {
            res.status(500).send({ error: "Authentication failed..!!" });
            return;
        }

        const checkUser = await user.findFirst({
            where: { email }
        });

        if (checkUser == null) {
            res.send("No records found!!");
            return;
        } else if (checkUser) {
            const dbPassword = checkUser.password;

            const keysec = process.env.ENCRYPTION_KEY as string;

            var bytes = CryptoJS.AES.decrypt(dbPassword, keysec);
            var originalText = bytes.toString(CryptoJS.enc.Utf8);

            if (originalText == password) {

                res.send({
                    userId: checkUser!.id,
                    message: "User logged in successfully",
                });

            } else {
                console.log("Password authentication failed.");
                res.status(500).send({ error: "Authentication failed!!" });
            }
        } 
    }
    catch (error) {
        console.log(error);
        res.status(500).send({ message: error });
    }
};

export {
    createPerson,
    allUsers,
    loginUser
};
