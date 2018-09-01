import { UserSettings } from '../../User';


const expectBackground = (background: UserSettings.Background) => {
  background.align.should.match(/^(tl|tr|bl|br)$/);
  background.ialp.should.be.a.Number().within(0, 100);
  background.tile.should.be.a.Number().within(0, 1);
  background.bgalp.should.be.a.Number().within(0, 100);
  background.bgc.should.be.a.String().and.match(/^(.{0}|[0-9a-fA-F]{6})$/);
  background.useimg.should.be.a.Number().within(0, 1);
  background.hasrec.should.be.a.Number().within(0, 1);
  background.isvid.should.be.a.Number().within(0, 1);
};

export default expectBackground;
