import { Request, Response, NextFunction} from 'express';

export const isLoggedIn = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    console.log("user", req.session?.username)
    if (req.session?.username) {
      //called Next here
      next();
    } else {
      // redirect to index page
      res.redirect("/index.html")
    }
};