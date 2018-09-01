import { UserSettings } from '../../User';


const expectStyle = (style: UserSettings.Style) => {
  style.nameColor.should.be.a.String().and.match(/^(.{0}|[0-9a-fA-F]{6})$/);
  style.textColor.should.be.a.String().and.match(/^(.{0}|[0-9a-fA-F]{6})$/);
  style.fontSize.should.be.a.Number().within(9, 22);
  style.fontFamily.should.be.a.Number().within(0, 8);
  // font should be one of the enumerated fonts
  style.fontFamily.should.be.oneOf(...Object.values(UserSettings.Style.Font));
  style.bold.should.be.Boolean();
  style.italics.should.be.Boolean();
  style.underline.should.be.Boolean();
};

export default expectStyle;
