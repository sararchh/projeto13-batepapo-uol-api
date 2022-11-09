import express from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';

import Joi from 'joi';
import dayjs from 'dayjs';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
let participants;
let message;

mongoClient.connect().then(() => {
  db = mongoClient.db("batepapo-uol");
  participants = db.collection("participants");
  message = db.collection("message");
});


app.post('/participants', (req, res) => {
  try {
    const { name } = req.body;
    const schema = Joi.object({ name: Joi.string().min(3).required() });
    const { error, value } = schema.validate(req.body);

    if (error) {
      return res.status(422).send({ error: "Informe o usuário válido" });
    }

    participants.findOne({
      name
    }).then((user) => {
      if (!user) {
        insertParticipant();
      } else {
        return res.status(409).send({ error: "Usuário já cadastrado" });
      }
    });

    const insertParticipant = () => {
      participants.insertOne({
        name,
        lastStatus: Date.now()
      }).then(() => {
        return res.sendStatus(201);
      });
      insertMessagePattern();
    }

    const insertMessagePattern = () => {
      message.insertOne({
        from: name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: dayjs().format('hh:mm:ss')
      });
    }

  } catch (error) {
    return res.sendStatus(422);
  }

});

app.get('/participants', (req, res) => {
  db.collection("participants").find().toArray().then(users => {
    return res.send(users);
  });
});

const port = process.env.PORT || 5000;

app.listen(5000, () => {
  console.log('listening on port ' + port + ' 🚀');
});